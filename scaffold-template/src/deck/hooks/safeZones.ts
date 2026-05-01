// Safe-zone constants and pure geometry helpers used by useOverlapResolver
// and the debug overlay. No DOM access here — all functions are pure math.
// R023.AC4

export const SAFE_ZONES = {
  topCaption: { top: 0, height: 22 },      // top 22% — caption strip
  bottomIndicator: { top: 95, height: 5 }, // bottom 5% — step indicator
  sideMargin: 4                             // 4% left + right margin
};

/** Axis-aligned rectangle in percent-of-canvas coordinates. */
export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Returns true when the rect overlaps the given named safe zone (inclusive
 * of partial overlap). Used by the layout lint and the resolver priority
 * heuristic.
 */
export function isInSafeZone(
  rect: Rect,
  zone: 'topCaption' | 'bottomIndicator'
): boolean {
  const z = SAFE_ZONES[zone];
  // Vertical overlap check: rect bottom > zone top AND rect top < zone bottom
  const rectBottom = rect.y + rect.h;
  const zoneBottom = z.top + z.height;
  return rectBottom > z.top && rect.y < zoneBottom;
}

/**
 * Returns true when rectangles a and b overlap (strict — edge-touching is
 * NOT considered an overlap).
 */
export function intersects(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

/**
 * Returns the area of the intersection of a and b. Returns 0 when they do
 * not overlap. Used to prioritise which overlapping pair to resolve first
 * (largest intersection area = highest urgency).
 */
export function intersectionArea(a: Rect, b: Rect): number {
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (overlapX <= 0 || overlapY <= 0) return 0;
  return overlapX * overlapY;
}
