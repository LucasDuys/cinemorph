/**
 * Card
 *
 * Supported morph shapes: card
 * Per-stage props: layout, child content
 * Stage-invariant: border radius, padding, surface style
 *
 * Visual rendering: T010 implementation — rounded card with children.
 */
import type { ReactNode } from 'react';

type CardProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  children?: ReactNode;
};

export default function Card({ layout, stage, children }: CardProps) {
  return (
    <div className="h-full w-full rounded-xl border border-border bg-surface-raised p-5 shadow-md">
      {children}
    </div>
  );
}
