// Per-stage layouts. Each persistent element has a layoutId; this file
// declares its position {left%, top%, width%, height%} at every stage.
// Motion's layout prop FLIP-animates the deltas using MORPH_TRANSITION.
// Pattern adopted from C:\dev\bunq--hackathon\components\demo-deck\canvas\stages.ts.

import type { ConnectorId } from './data';

export type Pos = {
  left: string;
  top: string;
  width: string;
  height: string;
};

export type Shape = 'orbit' | 'cluster' | 'pipeline' | 'citation' | 'footer' | 'hidden';

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
};

export type StageConfig = {
  id: number;
  name: string;
  caption: Caption;
  wordmark: ElementLayout;
  searchBar: ElementLayout;
  question: ElementLayout;
  answer: ElementLayout;
  connectors: Record<ConnectorId, ElementLayout>;
  frames: {
    hero?: boolean;
    problem?: boolean;
    solution?: boolean;
    differentiation?: boolean;
    teamAsk?: boolean;
  };
};

const HIDDEN: ElementLayout = {
  pos: { left: '50%', top: '50%', width: '0%', height: '0%' },
  shape: 'hidden',
  opacity: 0
};

// 5 connector positions on a slow orbit around the wordmark in stage 1.
// Math: 5 points evenly distributed on a circle, radius ~22% from center.
const ORBIT_RADIUS = 22;
function orbitPos(index: number, total: number): Pos {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const cx = 50;
  const cy = 50;
  const w = 5;
  const h = 5;
  const left = cx + Math.cos(angle) * ORBIT_RADIUS - w / 2;
  const top = cy + Math.sin(angle) * ORBIT_RADIUS - h / 2;
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${w}%`,
    height: `${h}%`
  };
}

// Stage 2 — connectors crowd around the silhouette on the LEFT half of the
// canvas (cx=25) so the medtech quote bubble has its own room on the right.
function clusterPos(index: number, total: number): Pos {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const cx = 25;
  const cy = 52;
  const r = 10;
  const w = 4.5;
  const h = 4.5;
  return {
    left: `${cx + Math.cos(angle) * r - w / 2}%`,
    top: `${cy + Math.sin(angle) * r - h / 2}%`,
    width: `${w}%`,
    height: `${h}%`
  };
}

// Stage 3 — connectors form a horizontal pipeline above the search bar.
function pipelinePos(index: number, total: number): Pos {
  const startX = 30;
  const endX = 70;
  const stepX = (endX - startX) / (total - 1);
  return {
    left: `${startX + index * stepX - 2}%`,
    top: '20%',
    width: '4%',
    height: '4%'
  };
}

// Stage 4 — connectors morph into a vertical pill stack on the left so they
// can directly emit chunks toward the centralised knowledge-base cylinder.
// Each pill grows tall enough to fit the brand label (handled in
// ConnectorElement when stageId === 3).
function pipelineLeftPos(index: number): Pos {
  return {
    left: '5%',
    top: `${22 + index * 11}%`,
    width: '18%',
    height: '7%'
  };
}

// Stage 4 — small footer strip at the bottom.
function footerPos(index: number, total: number): Pos {
  const startX = 4;
  const stepX = 5;
  return {
    left: `${startX + index * stepX}%`,
    top: '92%',
    width: '3%',
    height: '3%'
  };
}

const ORDER: ConnectorId[] = ['drive', 'slack', 'github', 'notion', 'onedrive'];

function buildConnectorMap(
  shape: Shape,
  fn: (i: number, total: number) => Pos,
  opacity: number = 1
): Record<ConnectorId, ElementLayout> {
  const out = {} as Record<ConnectorId, ElementLayout>;
  ORDER.forEach((id, i) => {
    out[id] = { pos: fn(i, ORDER.length), shape, opacity };
  });
  return out;
}

export const STAGES: StageConfig[] = [
  // ─── STAGE 1 — HOOK ─────────────────────────────────────────────────────
  {
    id: 0,
    name: 'Hook',
    caption: {
      eyebrow: 'STACKLINK · SOVEREIGN KNOWLEDGE OS',
      headline: 'The knowledge layer becoming the agentic OS.',
      sub: 'Built by two students. Knowledge platform live across five connectors. Automated onboarding shipping next.'
    },
    // 60% wide × 24% tall, centered: left = (100-60)/2 = 20%, top = (100-24)/2 = 38%.
    wordmark: {
      pos: { left: '20%', top: '38%', width: '60%', height: '24%' },
      shape: 'pipeline'
    },
    searchBar: HIDDEN,
    question: HIDDEN,
    answer: HIDDEN,
    connectors: buildConnectorMap('orbit', orbitPos, 0.4),
    frames: { hero: true }
  },

  // ─── STAGE 2 — PROBLEM ──────────────────────────────────────────────────
  {
    id: 1,
    name: 'Problem',
    caption: {
      eyebrow: 'THE PROBLEM',
      headline: 'Your company knows everything. Nobody can find it.',
      sub: 'A real story from a Dutch medtech: forty minutes lost finding a travel policy buried in a six-month-old Slack thread. Multiply by every knowledge worker, every day.'
    },
    // Wordmark sits just under the caption strip so it anchors the slide
    // visually instead of floating in the corner.
    wordmark: {
      pos: { left: '6%', top: '14%', width: '16%', height: '6%' },
      shape: 'pipeline'
    },
    searchBar: HIDDEN,
    question: {
      pos: { left: '48%', top: '24%', width: '47%', height: '34%' },
      shape: 'pipeline'
    },
    answer: HIDDEN,
    connectors: buildConnectorMap('cluster', clusterPos),
    frames: { problem: true }
  },

  // ─── STAGE 3 — SOLUTION ─────────────────────────────────────────────────
  {
    id: 2,
    name: 'Today',
    caption: {
      eyebrow: 'TODAY · KNOWLEDGE LAYER',
      headline: 'One search bar. Five sources. One audit-ready answer.',
      sub: 'Drive, Slack, GitHub, Notion, OneDrive unified into one knowledge graph. Cited. EU-sovereign by default. Conflicts resolved.'
    },
    wordmark: {
      pos: { left: '4%', top: '4%', width: '14%', height: '5%' },
      shape: 'pipeline'
    },
    searchBar: {
      pos: { left: '15%', top: '34%', width: '70%', height: '8%' },
      shape: 'pipeline'
    },
    question: {
      pos: { left: '15%', top: '34%', width: '70%', height: '8%' },
      shape: 'hidden',
      opacity: 0
    },
    // Slimmed answer card height so the ops-loop strip below has room to breathe.
    answer: {
      pos: { left: '15%', top: '48%', width: '70%', height: '30%' },
      shape: 'pipeline'
    },
    connectors: buildConnectorMap('pipeline', pipelinePos),
    frames: { solution: true }
  },

  // ─── STAGE 4 — DIFFERENTIATION ──────────────────────────────────────────
  {
    id: 3,
    name: 'Tomorrow',
    caption: {
      eyebrow: 'TOMORROW · AGENTIC INFRASTRUCTURE',
      headline: 'Knowledge becomes the substrate. Agents do the work on top.',
      sub: 'Automated onboarding is the first agent. Long-term: any user describes any time-consuming task, and the system ships the agent.'
    },
    // Prominent wordmark above the cinematic SVG so the brand stays anchored
    // while the connectors → cylinder → agents narrative plays underneath.
    wordmark: {
      pos: { left: '39%', top: '5%', width: '22%', height: '7%' },
      shape: 'pipeline'
    },
    // Persistent connectors are hidden on slide 4 — the TomorrowFrame
    // renders dedicated HTML pills on the left so the brand icons and
    // labels render reliably as the chunk emitters.
    searchBar: HIDDEN,
    question: HIDDEN,
    answer: HIDDEN,
    connectors: buildConnectorMap('footer', footerPos, 0),
    frames: { differentiation: true }
  },

  // ─── STAGE 5 — TEAM + ASK ───────────────────────────────────────────────
  {
    id: 4,
    name: 'Team + Reach',
    caption: {
      eyebrow: 'WHAT WE’D LOVE',
      headline: 'Three test partners. Honest feedback. Stay in touch.',
      sub: 'We’re not raising. We want EU mid-market companies willing to pilot Stacklink on real data so we can measure what we save.'
    },
    // Bottom-right signature so it doesn't collide with the footer connector strip.
    wordmark: {
      pos: { left: '78%', top: '88%', width: '18%', height: '6%' },
      shape: 'pipeline'
    },
    searchBar: HIDDEN,
    question: HIDDEN,
    answer: HIDDEN,
    connectors: buildConnectorMap('footer', footerPos, 0.4),
    frames: { teamAsk: true }
  }
];

export { HIDDEN };
