// Overlap resolver hook. After every paint it measures [data-morph-id],
// [data-frame-id], and [data-caption-strip] elements, converts pixel rects
// to %-of-canvas, and greedily pushes lower-priority elements away from
// higher-priority ones. Convergence cap: 3 iterations OR 50 ms.
//
// R023.AC1 — hook exists with correct signature
// R023.AC2 — measures all three selector groups
// R023.AC3 — converts to %-of-canvas
// R023.AC5 — convergence cap 3 iterations / 50 ms
// R023.AC6 — returns warnings + debugRects; writes back via callback

import { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { intersects, intersectionArea, type Rect } from './safeZones';
import type { StageConfig } from '../stages';

export type OverlapWarning = {
  elementId: string;
  neighbors: string[];
  adjusted: boolean;
};

export type LayoutOverride = { id: string; rect: Rect };

export type UseOverlapResolverOptions = {
  /** When true (or ?debug=overlap in URL) the hook populates debugRects. */
  debug?: boolean;
  /** Called whenever the resolver produces adjusted positions. */
  onOverrides?: (overrides: LayoutOverride[]) => void;
};

export type UseOverlapResolverResult = {
  warnings: OverlapWarning[];
  debugRects: Rect[];
};

const MAX_ITERATIONS = 3;
const MAX_MS = 50;
const RESIZE_DEBOUNCE_MS = 150;

/** Converts a DOMRect to %-of-canvas Rect. */
function toPercentRect(el: DOMRect, canvas: DOMRect): Rect {
  return {
    x: ((el.left - canvas.left) / canvas.width) * 100,
    y: ((el.top - canvas.top) / canvas.height) * 100,
    w: (el.width / canvas.width) * 100,
    h: (el.height / canvas.height) * 100
  };
}

/** Priority index: lower number = higher priority (will not be moved). */
function priority(type: 'caption' | 'frame' | 'persistent'): number {
  if (type === 'caption') return 0;
  if (type === 'frame') return 1;
  return 2;
}

type MeasuredElement = {
  id: string;
  rect: Rect;
  prio: number;
  domEl: Element;
};

/**
 * Greedy single-axis push: move `lower` away from `higher` along the axis
 * with smallest required delta. Returns the new rect for `lower`.
 */
function pushAway(lower: Rect, higher: Rect): Rect {
  // Compute overlap on each axis
  const overlapRight = higher.x + higher.w - lower.x;  // push lower left
  const overlapLeft  = lower.x + lower.w - higher.x;   // push lower right
  const overlapDown  = higher.y + higher.h - lower.y;  // push lower up
  const overlapUp    = lower.y + lower.h - higher.y;   // push lower down

  const candidates = [
    { axis: 'right', delta: overlapRight },
    { axis: 'left',  delta: overlapLeft },
    { axis: 'down',  delta: overlapDown },
    { axis: 'up',    delta: overlapUp }
  ].filter(c => c.delta > 0).sort((a, b) => a.delta - b.delta);

  if (candidates.length === 0) return lower;
  const best = candidates[0];

  switch (best.axis) {
    case 'right': return { ...lower, x: lower.x - best.delta };
    case 'left':  return { ...lower, x: lower.x + best.delta };
    case 'down':  return { ...lower, y: lower.y - best.delta };
    case 'up':    return { ...lower, y: lower.y + best.delta };
    default:      return lower;
  }
}

function isDebugMode(options?: UseOverlapResolverOptions): boolean {
  if (options?.debug) return true;
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('debug') === 'overlap';
  }
  return false;
}

export function useOverlapResolver(
  stage: StageConfig,
  options?: UseOverlapResolverOptions
): UseOverlapResolverResult {
  const [warnings, setWarnings] = useState<OverlapWarning[]>([]);
  const [debugRects, setDebugRects] = useState<Rect[]>([]);

  // Stable reference guard for React 18 strict-mode double-invocation.
  const resolveGuard = useRef(false);
  const resizeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId        = useRef<number | null>(null);

  const resolve = useCallback(() => {
    if (resolveGuard.current) return;
    resolveGuard.current = true;

    // Find the canvas container (parent of [data-morph-id] elements, or
    // first element with [data-canvas]).
    const canvasEl =
      document.querySelector('[data-canvas]') ??
      document.querySelector('[data-morph-id]')?.parentElement;

    if (!canvasEl) {
      resolveGuard.current = false;
      return;
    }

    const canvasRect = canvasEl.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      resolveGuard.current = false;
      return;
    }

    // Measure all tracked elements.
    const elements: MeasuredElement[] = [];

    const captionEl = document.querySelector('[data-caption-strip]');
    if (captionEl) {
      elements.push({
        id: 'caption',
        rect: toPercentRect(captionEl.getBoundingClientRect(), canvasRect),
        prio: priority('caption'),
        domEl: captionEl
      });
    }

    document.querySelectorAll('[data-frame-id]').forEach(el => {
      elements.push({
        id: el.getAttribute('data-frame-id') ?? 'frame',
        rect: toPercentRect(el.getBoundingClientRect(), canvasRect),
        prio: priority('frame'),
        domEl: el
      });
    });

    document.querySelectorAll('[data-morph-id]').forEach(el => {
      elements.push({
        id: el.getAttribute('data-morph-id') ?? 'unknown',
        rect: toPercentRect(el.getBoundingClientRect(), canvasRect),
        prio: priority('persistent'),
        domEl: el
      });
    });

    // Sort by priority so higher-priority items are anchored first.
    elements.sort((a, b) => a.prio - b.prio);

    // Working copy of rects (mutable during iteration).
    const rects = elements.map(e => ({ ...e.rect }));

    const warnMap: Map<string, Set<string>> = new Map();
    const overrides: LayoutOverride[] = [];
    const overlapPairs: Rect[] = [];

    const start = performance.now();
    let iteration = 0;

    while (iteration < MAX_ITERATIONS && performance.now() - start < MAX_MS) {
      let anyAdjusted = false;

      // Sort pairs by intersection area descending so biggest conflicts
      // are resolved first in each iteration.
      const pairs: Array<{ hi: number; lo: number; area: number }> = [];
      for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
          const area = intersectionArea(rects[i], rects[j]);
          if (area > 0) {
            pairs.push({ hi: i, lo: j, area });
          }
        }
      }
      pairs.sort((a, b) => b.area - a.area);

      for (const { hi, lo } of pairs) {
        if (!intersects(rects[hi], rects[lo])) continue;

        const loEl = elements[lo];
        const hiEl = elements[hi];

        const newRect = pushAway(rects[lo], rects[hi]);
        rects[lo] = newRect;
        anyAdjusted = true;

        if (!warnMap.has(loEl.id)) warnMap.set(loEl.id, new Set());
        warnMap.get(loEl.id)!.add(hiEl.id);

        if (isDebugMode(options)) {
          overlapPairs.push({ ...rects[lo] });
        }
      }

      if (!anyAdjusted) break;
      iteration++;
    }

    // Check for remaining overlaps (convergence failure).
    const newWarnings: OverlapWarning[] = [];
    for (const [id, neighbors] of warnMap.entries()) {
      const idx = elements.findIndex(e => e.id === id);
      const stillOverlapping = elements.some((other, j) => {
        if (other.id === id) return false;
        return intersects(rects[idx], rects[j]);
      });

      if (stillOverlapping) {
        console.warn(
          `[useOverlapResolver] Convergence failed for element "${id}" after ${MAX_ITERATIONS} iterations.`
        );
      }

      newWarnings.push({
        elementId: id,
        neighbors: Array.from(neighbors),
        adjusted: true
      });
    }

    // Write overrides via caller-supplied callback (don't mutate stage).
    elements.forEach((el, i) => {
      const original = el.rect;
      const adjusted = rects[i];
      if (
        adjusted.x !== original.x ||
        adjusted.y !== original.y ||
        adjusted.w !== original.w ||
        adjusted.h !== original.h
      ) {
        overrides.push({ id: el.id, rect: adjusted });
      }
    });

    if (overrides.length > 0) {
      options?.onOverrides?.(overrides);
    }

    // Only update state when something changed (stable refs when no overlaps).
    if (newWarnings.length > 0 || warnings.length > 0) {
      setWarnings(newWarnings);
    }
    if (isDebugMode(options)) {
      setDebugRects(overlapPairs);
    }

    resolveGuard.current = false;
  }, [stage.id, options]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    // Use rAF to ensure measurement happens AFTER the initial paint.
    rafId.current = requestAnimationFrame(() => {
      resolveGuard.current = false; // allow resolve after rAF (strict-mode safe)
      resolve();
    });

    function handleResize() {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        resolveGuard.current = false;
        resolve();
      }, RESIZE_DEBOUNCE_MS);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      window.removeEventListener('resize', handleResize);
      resolveGuard.current = false;
    };
  }, [resolve]);

  return { warnings, debugRects };
}
