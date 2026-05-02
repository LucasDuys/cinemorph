/**
 * OrbitPoints3D
 *
 * N points distributed on a sphere surface via Fibonacci sphere algorithm,
 * auto-rotating each frame. Lives INSIDE a @react-three/fiber <Canvas>.
 *
 * Props:
 *   count        -- number of points on the sphere
 *   radius       -- sphere radius
 *   pointSize?   -- size of each point (default 0.04)
 *   rotation?    -- initial [x, y, z] euler angles (default [0, 0, 0])
 *   rotationSpeed? -- rad/s auto-rotation around Y axis (default 0.3)
 *   color?       -- override point color; if absent reads --surface-raised CSS var
 *   accentColor? -- accent color (currently unused; available for callers)
 *
 * R009.AC1: Fibonacci distribution + useFrame auto-rotation.
 * R009.AC3: Color falls back to CSS variable --surface-raised when prop absent.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points } from '@react-three/drei';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Fibonacci sphere distribution
// ---------------------------------------------------------------------------

/**
 * Returns a Float32Array of (x, y, z) triplets for `count` points evenly
 * distributed on the surface of a sphere with the given radius.
 */
function fibonacciSpherePositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.399963 rad

  for (let i = 0; i < count; i++) {
    // y goes from 1 to -1
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;

    positions[i * 3] = Math.cos(theta) * radiusAtY * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * radius;
  }

  return positions;
}

// ---------------------------------------------------------------------------
// OrbitPoints3D
// ---------------------------------------------------------------------------

export interface OrbitPoints3DProps {
  count: number;
  radius: number;
  pointSize?: number;
  rotation?: [number, number, number];
  rotationSpeed?: number;
  color?: string;
  accentColor?: string;
}

export function OrbitPoints3D({
  count,
  radius,
  pointSize = 0.04,
  rotation = [0, 0, 0],
  rotationSpeed = 0.3,
  color,
  accentColor: _accentColor,
}: OrbitPoints3DProps): React.ReactElement {
  // Effective color: prop > CSS variable --surface-raised > fallback white.
  const [effectiveColor, setEffectiveColor] = useState<string>(color ?? '#ffffff');

  useEffect(() => {
    if (color) {
      setEffectiveColor(color);
      return;
    }
    // Read CSS variable from the document root (R009.AC3).
    const cssValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--surface-raised')
      .trim();
    if (cssValue) {
      setEffectiveColor(cssValue);
    }
  }, [color]);

  // Compute positions once when count or radius changes.
  const positions = useMemo(
    () => fibonacciSpherePositions(count, radius),
    [count, radius]
  );

  const groupRef = useRef<THREE.Group>(null!);

  // Auto-rotate around Y axis each frame (R009.AC1).
  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed * delta;
    }
  });

  return (
    <group
      ref={groupRef}
      rotation={new THREE.Euler(...rotation)}
    >
      <Points positions={positions} limit={count}>
        <pointsMaterial
          size={pointSize}
          color={effectiveColor}
          sizeAttenuation
        />
      </Points>
    </group>
  );
}

export default OrbitPoints3D;
