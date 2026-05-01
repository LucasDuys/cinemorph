/**
 * PipelineGroup
 *
 * Supported morph shapes: pipeline
 * Per-stage props: layout, child positions along horizontal line
 * Stage-invariant: linear arrangement, flow direction
 *
 * Visual rendering: T010 implementation — items positioned linearly.
 */
import type { ReactNode } from 'react';

type PipelineGroupProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  count: number;
  startX?: number;
  endX?: number;
  top?: number;
  children: (i: number) => ReactNode;
};

export default function PipelineGroup({ layout, stage, count, startX = 30, endX = 70, top = 20, children }: PipelineGroupProps) {
  const positions = Array.from({ length: count }, (_, i) => {
    const x = startX + (i / (count - 1)) * (endX - startX);
    return { x };
  });

  return (
    <div className="relative h-full w-full">
      {positions.map((pos, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${pos.x}%`, top: `${top}%`, transform: 'translate(-50%, -50%)' }}
        >
          {children(i)}
        </div>
      ))}
    </div>
  );
}
