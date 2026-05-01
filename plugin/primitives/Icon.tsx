/**
 * Icon
 *
 * Supported morph shapes: icon
 * Per-stage props: layout, svg (ReactNode icon)
 * Stage-invariant: stroke width, square aspect ratio
 *
 * Visual rendering: T010 implementation — centered SVG icon.
 */
import type { ReactNode } from 'react';

type IconProps = {
  layout: { left: string; top: string; width: string; height: string; opacity?: number };
  stage: { id: number; name: string };
  svg: ReactNode;
};

export default function Icon({ layout, stage, svg }: IconProps) {
  return (
    <div className="flex h-full w-full items-center justify-center text-foreground">
      {svg}
    </div>
  );
}
