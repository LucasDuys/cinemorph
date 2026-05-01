/**
 * OrbitGroup
 *
 * Supported morph shapes: orbit
 * Per-stage props: layout, child positions on circle
 * Stage-invariant: circular arrangement, child component identity
 *
 * Visual rendering: T010 implementation — items positioned on orbit circle.
 */
import type { ReactNode } from 'react';

type OrbitGroupProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  count: number;
  radius?: number;
  children: (i: number) => ReactNode;
};

export default function OrbitGroup({ layout, stage, count, radius = 22, children }: OrbitGroupProps) {
  const positions = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    return { x, y };
  });

  return (
    <div className="relative h-full w-full">
      {positions.map((pos, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          {children(i)}
        </div>
      ))}
    </div>
  );
}
