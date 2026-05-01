// Static-fade backdrops that appear under the morphing element layer. Each
// frame is gated on a stage flag (stage.frames.{name}) and uses
// AnimatePresence to fade in/out via FRAME_FADE / FRAME_FADE_OUT.
//
// These exports are intentionally lean structural stubs. The composer
// (T015) and downstream tasks fill in stage-specific content — stat
// callouts, ops loops, pillar lists, team/ask grids — either via the
// stage.frames extension fields the composer authors, or via custom
// elements registered through ./elements.tsx.
//
// Frame export name convention: `${Pascal}Frame` (e.g. HeroFrame for the
// `hero` flag). Canvas.tsx resolves stage.frames keys against that
// convention, so adding a new frame here is enough to wire it up.

import { motion, AnimatePresence } from 'motion/react';
import type { ReactNode } from 'react';
import { FRAME_FADE, FRAME_FADE_OUT } from './pace';
import type { StageConfig } from './stages';

type FrameProps = {
  visible: boolean;
  // stage is forwarded so composer-authored frame content can read
  // stage-specific extension fields without changing this signature.
  stage: StageConfig;
};

function FrameShell({
  keyId,
  visible,
  children
}: {
  keyId: string;
  visible: boolean;
  children?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={keyId}
          data-frame-id={keyId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: FRAME_FADE_OUT }}
          transition={FRAME_FADE}
          className="pointer-events-none absolute inset-0"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Hero frame ─────────────────────────────────────────────────────────────
export function HeroFrame({ visible, stage: _stage }: FrameProps) {
  return <FrameShell keyId="hero-frame" visible={visible} />;
}

// ─── Problem frame ──────────────────────────────────────────────────────────
export function ProblemFrame({ visible, stage: _stage }: FrameProps) {
  return <FrameShell keyId="problem-frame" visible={visible} />;
}

// ─── Solution frame ─────────────────────────────────────────────────────────
export function SolutionFrame({ visible, stage: _stage }: FrameProps) {
  return <FrameShell keyId="solution-frame" visible={visible} />;
}

// ─── Differentiation frame ──────────────────────────────────────────────────
export function DifferentiationFrame({ visible, stage: _stage }: FrameProps) {
  return <FrameShell keyId="differentiation-frame" visible={visible} />;
}

// ─── Team + Ask frame ───────────────────────────────────────────────────────
export function TeamAskFrame({ visible, stage: _stage }: FrameProps) {
  return <FrameShell keyId="team-ask-frame" visible={visible} />;
}
