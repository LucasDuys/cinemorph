/**
 * Lattice3D
 *
 * A 3D grid of rows * cols * depth point instances rendered via
 * @react-three/drei <Instances> for a single draw call.
 *
 * Props:
 *   rows        -- grid rows (X axis)
 *   cols        -- grid columns (Y axis)
 *   depth       -- grid depth (Z axis)
 *   spacing?    -- distance between adjacent points (default 0.4)
 *   pointSize?  -- sphere radius for each instance point (default 0.04)
 *   color?      -- override color; if absent reads --accent CSS var
 *   accentColor? -- accent color (currently unused; available for callers)
 *   boundingBox? -- [w, h, d] override — scales spacing to fit within box
 *
 * R009.AC2: rows*cols*depth instances via @react-three/drei <Instances>.
 * R009.AC3: Color falls back to CSS variable --accent when prop absent.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Instances, Instance } from '@react-three/drei';

// ---------------------------------------------------------------------------
// Lattice3D
// ---------------------------------------------------------------------------

export interface Lattice3DProps {
  rows: number;
  cols: number;
  depth: number;
  spacing?: number;
  pointSize?: number;
  color?: string;
  accentColor?: string;
  boundingBox?: [number, number, number];
}

export function Lattice3D({
  rows,
  cols,
  depth,
  spacing = 0.4,
  pointSize = 0.04,
  color,
  accentColor: _accentColor,
  boundingBox,
}: Lattice3DProps): React.ReactElement {
  // Effective color: prop > CSS variable --accent > fallback cyan-ish.
  const [effectiveColor, setEffectiveColor] = useState<string>(color ?? '#38bdf8');

  useEffect(() => {
    if (color) {
      setEffectiveColor(color);
      return;
    }
    // Read CSS variable from the document root (R009.AC3).
    const cssValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent')
      .trim();
    if (cssValue) {
      setEffectiveColor(cssValue);
    }
  }, [color]);

  // Derive effective spacing from boundingBox if provided.
  const effectiveSpacing = useMemo(() => {
    if (!boundingBox) return spacing;
    const [w, h, d] = boundingBox;
    // Use the smallest axis to ensure all points fit within the box.
    const maxSpacingX = rows > 1 ? w / (rows - 1) : spacing;
    const maxSpacingY = cols > 1 ? h / (cols - 1) : spacing;
    const maxSpacingZ = depth > 1 ? d / (depth - 1) : spacing;
    return Math.min(maxSpacingX, maxSpacingY, maxSpacingZ);
  }, [rows, cols, depth, spacing, boundingBox]);

  // Pre-compute all instance positions.
  const instances = useMemo(() => {
    const list: { position: [number, number, number]; key: string }[] = [];
    // Center the grid around the origin.
    const offsetX = ((rows - 1) * effectiveSpacing) / 2;
    const offsetY = ((cols - 1) * effectiveSpacing) / 2;
    const offsetZ = ((depth - 1) * effectiveSpacing) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        for (let d = 0; d < depth; d++) {
          list.push({
            position: [
              r * effectiveSpacing - offsetX,
              c * effectiveSpacing - offsetY,
              d * effectiveSpacing - offsetZ,
            ],
            key: `${r}-${c}-${d}`,
          });
        }
      }
    }
    return list;
  }, [rows, cols, depth, effectiveSpacing]);

  const total = rows * cols * depth;

  return (
    <Instances limit={total} range={total}>
      <sphereGeometry args={[pointSize, 6, 6]} />
      <meshStandardMaterial color={effectiveColor} />
      {instances.map(({ position, key }) => (
        <Instance key={key} position={position} />
      ))}
    </Instances>
  );
}

export default Lattice3D;
