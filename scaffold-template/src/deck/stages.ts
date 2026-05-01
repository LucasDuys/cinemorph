// Stage layout schema. Each stage declares per-element layout (position +
// shape) plus optional caption, talkTrack, frame flags, and backup flag.
// Composer (T015) populates STAGES; the deck source ships with [].

export type Pos = { left: string; top: string; width: string; height: string };

export type Shape =
  | 'hero' | 'chrome'
  | 'orbit' | 'cluster' | 'pipeline' | 'footer'
  | 'card' | 'pillar' | 'kpi' | 'quote' | 'image' | 'diagram' | 'icon' | 'chart'
  | 'hidden';

export type ElementLayout = {
  pos: Pos;
  shape: Shape;
  opacity?: number;
  scale?: number;
};

export type Caption = {
  eyebrow: string;
  headline: string;
  sub?: string;
  hidden?: boolean;
};

export type TalkTrack = {
  script: string;
  dwellSeconds?: number;
  cues?: string[];
};

export type StageConfig = {
  id: number;
  name: string;
  caption: Caption;
  talkTrack?: TalkTrack;
  backup?: boolean;
  // Per-element layout. Element ids reference primitives by their index.ts
  // export name (lowercased) or custom-element ids resolved by T012's loader.
  // Omitting an element here means HIDDEN — see resolveLayout below.
  elements: Record<string, ElementLayout>;
  frames?: Record<string, boolean>;
};

// Hidden anchor: 0%×0% at canvas center, opacity 0. Keeps the morph chain
// alive across appear/disappear cycles. Omitting an element from a stage's
// `elements` map MUST be treated as HIDDEN by the resolver below.
export const HIDDEN: ElementLayout = {
  pos: { left: '50%', top: '50%', width: '0%', height: '0%' },
  shape: 'hidden',
  opacity: 0
};

// Composer fills this. Empty default = no stages = blank app (App.tsx
// shows a placeholder).
export const STAGES: StageConfig[] = [];

// Helper: returns the stage's layout for `elementId`, falling back to HIDDEN
// when the element isn't in the stage's map. Used by Canvas/elements glue.
export function resolveLayout(stage: StageConfig, elementId: string): ElementLayout {
  return stage.elements[elementId] ?? HIDDEN;
}
