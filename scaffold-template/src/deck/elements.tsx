// Persistent element dispatch layer. Each element id resolves to a layout
// from the active stage and is wrapped in a MorphBox so Motion's layoutId +
// layout props animate the delta between stages. The actual primitive
// component is looked up in ELEMENT_REGISTRY — populated by T010 (full
// primitive impl) and T012 (custom-element loader). Unregistered ids fall
// through to the HIDDEN anchor so the morph chain stays alive across
// appear/disappear cycles (R005.AC3).

import { motion } from 'motion/react';
import type { ReactElement, ReactNode, ComponentType } from 'react';
import { MORPH_TRANSITION } from './pace';
import { resolveLayout, type ElementLayout, type StageConfig } from './stages';

// Make sure the local barrel is part of the build graph so registrations
// performed there run before Canvas mounts.
import './elements/index';

// MorphBox: shared layout wrapper. Uses Motion's layoutId+layout for cross
// stage morphing. HIDDEN anchors collapse to a 0×0 invisible point at canvas
// center so the morph chain survives appear/disappear cycles.
export function MorphBox({
  layoutId,
  cfg,
  children,
  className = ''
}: {
  layoutId: string;
  cfg: ElementLayout;
  children?: ReactNode;
  className?: string;
}) {
  if (cfg.shape === 'hidden') {
    return (
      <motion.div
        layoutId={layoutId}
        layout
        className="pointer-events-none absolute"
        style={{ left: '50%', top: '50%', width: 0, height: 0 }}
        animate={{ opacity: 0 }}
        transition={MORPH_TRANSITION}
      />
    );
  }
  return (
    <motion.div
      layoutId={layoutId}
      layout
      data-morph-id={layoutId}
      className={`absolute ${className}`}
      style={cfg.pos}
      animate={{ opacity: cfg.opacity ?? 1 }}
      transition={MORPH_TRANSITION}
    >
      {children}
    </motion.div>
  );
}

// Element registry. Filled at scaffold-build time by T010 (built-in
// primitives) and at compose time by T012 (custom-element loader).
// An empty registry is valid — the dispatcher renders a HIDDEN anchor for
// unregistered ids.
export type ElementComponentProps = {
  layout: ElementLayout;
  stage: StageConfig;
  layoutId: string;
};
export type ElementComponent = ComponentType<ElementComponentProps>;

const ELEMENT_REGISTRY: Record<string, ElementComponent> = {};

export function registerElement(id: string, Component: ElementComponent): void {
  ELEMENT_REGISTRY[id] = Component;
}

export function getRegisteredElement(id: string): ElementComponent | undefined {
  return ELEMENT_REGISTRY[id];
}

// Dispatch a single element id against the active stage. Reads layout via
// resolveLayout (HIDDEN fallback baked in) and wraps the registry lookup in a
// MorphBox so unregistered ids still emit a stable layoutId anchor.
export function renderElement(id: string, stage: StageConfig): ReactElement {
  const cfg = resolveLayout(stage, id);
  const Component = ELEMENT_REGISTRY[id];
  return (
    <MorphBox layoutId={id} cfg={cfg} key={id}>
      {Component ? <Component layout={cfg} stage={stage} layoutId={id} /> : null}
    </MorphBox>
  );
}
