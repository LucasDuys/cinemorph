/**
 * Element3D
 *
 * Opt-in 3D primitive for cinematic stages. Dynamically imports
 * @react-three/fiber, @react-three/drei, and framer-motion-3d via
 * React.lazy + Suspense so these heavy dependencies are never bundled
 * into decks that don't use a 3D element (R008.AC1).
 *
 * The component renders a fixed-position WebGL overlay (see
 * Element3DOverlay) above the 2D canvas (R008.AC4). A motion.div
 * from framer-motion/react wraps the overlay container and accepts a
 * layoutId prop so 3D elements participate in the morph chain across
 * stages (R008.AC3).
 *
 * WebGL failure is caught by an ErrorBoundary; the fallback renders a
 * motion.div with the same layoutId showing the geometry name as text
 * in muted-foreground (R008.AC5).
 *
 * Supported geometry values: 'sphere', 'box', 'orbit-points',
 * 'lattice', 'custom'.
 */

import React, {
  Suspense,
  lazy,
  Component,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import { motion } from 'motion/react';
import type { ElementLayout, StageConfig } from '../../scaffold-template/src/deck/stages';

// ---------------------------------------------------------------------------
// Public prop types (R008.AC2)
// ---------------------------------------------------------------------------

export type Geometry3D = 'sphere' | 'box' | 'orbit-points' | 'lattice' | 'custom';

export interface Material3D {
  color: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}

export interface Element3DProps {
  geometry: Geometry3D;
  material: Material3D;
  layoutId?: string;
  layout: ElementLayout;
  stage: StageConfig;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// Lazy-loaded inner component
// ---------------------------------------------------------------------------

// Element3DInner is only loaded when a component actually mounts, so
// @react-three/fiber and framer-motion-3d are excluded from the initial
// bundle (R008.AC1).
const LazyElement3DInner = lazy(() =>
  import('./_internal/Element3DInner').then((mod) => ({ default: mod.Element3DInner }))
);

// ---------------------------------------------------------------------------
// ErrorBoundary (R008.AC5)
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  layoutId?: string;
  geometryName: string;
  children: ReactNode;
}

class Element3DErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Intentional: log WebGL/R3F initialization failures to console so
    // developers can identify the root cause without crashing the deck.
    console.warn('[Element3D] WebGL initialization failed:', error.message, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Fallback: same layoutId so morph chain stays alive (R008.AC5).
      return (
        <motion.div
          layoutId={this.props.layoutId}
          className="flex items-center justify-center text-muted-foreground text-sm"
          style={{ pointerEvents: 'none' }}
        >
          {this.props.geometryName}
        </motion.div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Element3D component
// ---------------------------------------------------------------------------

/**
 * Renders a 3D element as a fixed-position overlay above the 2D canvas.
 * Participates in the morph chain via layoutId (R008.AC3).
 */
export default function Element3D({
  geometry,
  material,
  layoutId,
  layout,
  stage,
  children,
}: Element3DProps): React.ReactElement {
  return (
    <Element3DErrorBoundary layoutId={layoutId} geometryName={geometry}>
      <Suspense
        fallback={
          <motion.div
            layoutId={layoutId}
            className="flex items-center justify-center text-muted-foreground text-sm"
            style={{ pointerEvents: 'none' }}
          >
            {geometry}
          </motion.div>
        }
      >
        <LazyElement3DInner
          geometry={geometry}
          material={material}
          layoutId={layoutId}
          layout={layout}
          stage={stage}
        >
          {children}
        </LazyElement3DInner>
      </Suspense>
    </Element3DErrorBoundary>
  );
}

