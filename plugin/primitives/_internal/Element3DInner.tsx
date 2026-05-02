/**
 * Element3DInner
 *
 * Lazily-loaded inner component for Element3D. This file is the dynamic
 * import boundary — it is the ONLY file that imports @react-three/fiber
 * and framer-motion-3d. These dependencies are never bundled into decks
 * that do not use Element3D (R008.AC1).
 *
 * Morph participation: the overlay container is wrapped in a motion.div
 * from framer-motion (2D) that forwards layoutId. Position/rotation/scale
 * tweens across stages are driven by the MORPH_TRANSITION from pace.ts
 * (R008.AC3).
 *
 * Geometry dispatch:
 *   sphere       -> <sphereGeometry />
 *   box          -> <boxGeometry />
 *   orbit-points -> placeholder mesh (replaced by T005 OrbitPoints3D)
 *   lattice      -> placeholder mesh (replaced by T005 Lattice3D)
 *   custom       -> renders children prop inside the Canvas
 */

import React, { type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'motion/react';
import type { Geometry3D, Material3D, Element3DProps } from '../Element3D';
import type { ElementLayout, StageConfig } from '../../../scaffold-template/src/deck/stages';
import { MORPH_TRANSITION } from '../../../scaffold-template/src/deck/pace';

// ---------------------------------------------------------------------------
// Geometry mesh dispatch
// ---------------------------------------------------------------------------

interface MeshSceneProps {
  geometry: Geometry3D;
  material: Material3D;
  children?: ReactNode;
}

function MeshScene({ geometry, material, children }: MeshSceneProps): React.ReactElement {
  const matProps = {
    color: material.color,
    opacity: material.opacity ?? 1,
    transparent: (material.opacity !== undefined && material.opacity < 1),
    metalness: material.metalness ?? 0,
    roughness: material.roughness ?? 0.5,
  };

  switch (geometry) {
    case 'sphere':
      return (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </>
      );

    case 'box':
      return (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <mesh>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </>
      );

    case 'orbit-points':
      // Placeholder: T005 OrbitPoints3D replaces this.
      return (
        <>
          <ambientLight intensity={0.6} />
          <mesh>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={material.color} />
          </mesh>
        </>
      );

    case 'lattice':
      // Placeholder: T005 Lattice3D replaces this.
      return (
        <>
          <ambientLight intensity={0.6} />
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial color={material.color} />
          </mesh>
        </>
      );

    case 'custom':
      return <>{children}</>;
  }
}

// ---------------------------------------------------------------------------
// Resolve pixel layout from percentage strings
// ---------------------------------------------------------------------------

function resolvePixelLayout(layout: ElementLayout): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  return {
    left: layout.pos.left,
    top: layout.pos.top,
    width: layout.pos.width,
    height: layout.pos.height,
  };
}

// ---------------------------------------------------------------------------
// Element3DInner
// ---------------------------------------------------------------------------

/**
 * The lazily loaded body of Element3D. Renders a transparent R3F Canvas
 * inside the Element3DOverlay portal. The motion.div wrapper provides
 * layoutId participation in the Framer Motion morph chain (R008.AC3).
 */
export function Element3DInner({
  geometry,
  material,
  layoutId,
  layout,
  stage: _stage,
  children,
}: Element3DProps): React.ReactElement {
  const pos = resolvePixelLayout(layout);

  return (
    // motion.div with layoutId participates in the morph chain (R008.AC3).
    <motion.div
      layoutId={layoutId}
      layout
      transition={MORPH_TRANSITION}
      style={{
        position: 'absolute',
        left: pos.left,
        top: pos.top,
        width: pos.width,
        height: pos.height,
        opacity: layout.opacity ?? 1,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 3], fov: 50 }}
      >
        <MeshScene geometry={geometry} material={material}>
          {children}
        </MeshScene>
      </Canvas>
    </motion.div>
  );
}
