// Debug overlay — renders red-bordered rectangles over each detected
// overlap zone, labeled with the element id. Visible only when
// options.debug === true OR the query param ?debug=overlap is set.
// Pure presentational: accepts rects from useOverlapResolver.

import type { Rect } from '../hooks/safeZones';

export type OverlapDebugOverlayProps = {
  rects: Rect[];
};

export function OverlapDebugOverlay({ rects }: OverlapDebugOverlayProps) {
  if (rects.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-50"
    >
      {rects.map((rect, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${rect.x}%`,
            top: `${rect.y}%`,
            width: `${rect.w}%`,
            height: `${rect.h}%`,
            border: '2px solid red',
            boxSizing: 'border-box'
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              background: 'rgba(255,0,0,0.75)',
              color: 'white',
              fontSize: '10px',
              padding: '1px 3px',
              lineHeight: 1.2,
              whiteSpace: 'nowrap'
            }}
          >
            overlap-{i}
          </span>
        </div>
      ))}
    </div>
  );
}
