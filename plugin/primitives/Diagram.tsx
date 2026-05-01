/**
 * Diagram
 *
 * Supported morph shapes: diagram
 * Per-stage props: layout, svg/html content slot
 * Stage-invariant: aspect ratio, line weights
 *
 * Visual rendering: T010 implementation — generic SVG/HTML slot.
 */
import type { ReactNode } from 'react';

type DiagramProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  children?: ReactNode;
};

export default function Diagram({ layout, stage, children }: DiagramProps) {
  return (
    <div className="h-full w-full">
      {children}
    </div>
  );
}
