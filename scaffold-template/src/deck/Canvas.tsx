// The persistent morphing canvas. Mounted once for the lifetime of the deck
// (Canvas is keyed stably — stage changes do NOT remount it). Every
// persistent element reads its layout from the active stage and morphs into
// place via Motion's layoutId + layout props. Frames render BEHIND the
// element layer in z-order and are stage-gated via stage.frames.{name}.
//
// The persistent layer is data-driven from `stage.elements` keys. Each id is
// dispatched through `renderElement` (see ./elements.tsx), which looks the
// id up in the element registry filled by T010 (built-in primitives) and
// T012 (custom-element loader). Unregistered ids resolve to the HIDDEN
// anchor so the morph chain stays alive.
//
// 3D overlay: when the current stage has `element3d: true`, Canvas mounts
// an Element3DOverlay portalled to document.body (z-index 50, pointer-events
// none). 2D and 3D content coexist via this overlay — the WebGL canvas is
// transparent and layered above the Framer Motion stage, not a replacement
// for it (R008.AC4).

import React, { type ComponentType, lazy, Suspense } from 'react';
import { LayoutGroup } from 'motion/react';
import { renderElement } from './elements';
import * as frames from './frames';
import type { StageConfig } from './stages';

// Element3DOverlay is a small portal wrapper with no R3F deps. Import it
// statically so it's available whenever a stage requests 3D.
// The R3F heavyweight code lives in Element3DInner (dynamically imported
// inside Element3D via React.lazy), so non-3D decks still pay no bundle cost.
const LazyElement3DOverlay = lazy(
  () => import('../../../plugin/primitives/Element3DOverlay')
);

// ---------------------------------------------------------------------------
// Extend StageConfig to allow optional element3d flag
// ---------------------------------------------------------------------------

// Extend StageConfig to allow optional element3d flag (set by 3D-aware
// composers; decks without 3D never set this field).
export interface StageConfigWith3D extends StageConfig {
  element3d?: boolean;
}

type FrameComponent = ComponentType<{ visible: boolean; stage: StageConfig }>;

// Map a stage.frames key (e.g. "hero") to the matching exported component
// name (e.g. "HeroFrame"). The composer can author additional frames; as
// long as they follow the `${Pascal}Frame` export convention, this lookup
// picks them up without changes here.
function frameComponent(name: string): FrameComponent | undefined {
  if (!name) return undefined;
  const exportName = `${name[0].toUpperCase()}${name.slice(1)}Frame`;
  return (frames as Record<string, unknown>)[exportName] as FrameComponent | undefined;
}

// ---------------------------------------------------------------------------
// Canvas props
// ---------------------------------------------------------------------------

export interface CanvasProps {
  stage: StageConfig;
  // Pass all stages so Canvas can detect if any stage has `element3d: true`
  // and pre-load the overlay module before the user reaches that stage.
  allStages?: StageConfig[];
}

// ---------------------------------------------------------------------------
// Canvas component
// ---------------------------------------------------------------------------

export function Canvas({ stage, allStages }: CanvasProps) {
  const frameEntries = Object.entries(stage.frames ?? {});

  // Determine if the current stage needs the 3D overlay.
  const currentStage3D = (stage as StageConfigWith3D).element3d === true;

  // Also check if any stage in the deck uses 3D so we can pre-load the overlay
  // module before the user reaches a 3D stage.
  const anyStage3D = allStages
    ? allStages.some((s) => (s as StageConfigWith3D).element3d === true)
    : currentStage3D;

  return (
    <div className="absolute inset-0">
      {/* Top + bottom padding so the caption strip + step indicator never
          overlap morphing element content. */}
      <div className="relative mx-auto h-full w-full max-w-[1600px] px-8 pt-56 pb-20">
        <div className="relative h-full w-full">
          {/* Frames: behind the element layer */}
          {frameEntries.map(([name, on]) => {
            const FrameComp = frameComponent(name);
            if (!FrameComp) return null;
            return <FrameComp key={name} visible={on === true} stage={stage} />;
          })}

          {/* Persistent element layer — single LayoutGroup so every
              layoutId resolves across all members. Data-driven from
              stage.elements keys; unregistered ids fall through to the
              HIDDEN anchor inside renderElement. */}
          <LayoutGroup>
            {Object.keys(stage.elements).map((id) => renderElement(id, stage))}
          </LayoutGroup>
        </div>
      </div>

      {/* 3D overlay: portalled to document.body at z-index 50 with
          pointer-events none. Mounted when the current stage has
          element3d: true. The lazy import means Element3DOverlay is
          excluded from non-3D deck bundles (R008.AC1 + R008.AC4).
          Pre-loading starts when anyStage3D is true so the overlay
          is ready before the user reaches the first 3D stage. */}
      {anyStage3D && currentStage3D && (
        <Suspense fallback={null}>
          <LazyElement3DOverlay>
            {/* Element3D components are placed here by the deck's stage
                configuration when element3d: true is set. */}
          </LazyElement3DOverlay>
        </Suspense>
      )}
    </div>
  );
}
