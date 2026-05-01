/**
 * FooterStrip
 *
 * Supported morph shapes: footer
 * Per-stage props: layout, child contents
 * Stage-invariant: bottom-anchored strip, compact height
 *
 * Visual rendering: T010 implementation — bottom strip layout.
 */
import type { ReactNode } from 'react';

type FooterStripProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  count: number;
  startX?: number;
  stepX?: number;
  top?: number;
  children: (i: number) => ReactNode;
};

export default function FooterStrip({ layout, stage, count, startX = 4, stepX = 5, top = 92, children }: FooterStripProps) {
  const positions = Array.from({ length: count }, (_, i) => ({
    x: startX + i * stepX,
  }));

  return (
    <div className="relative h-full w-full">
      {positions.map((pos, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${pos.x}%`, top: `${top}%`, transform: 'translateX(-50%)' }}
        >
          {children(i)}
        </div>
      ))}
    </div>
  );
}
