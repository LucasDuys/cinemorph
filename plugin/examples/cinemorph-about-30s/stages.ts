// Cinemorph about 30s — per-scene element layouts.
// Mirrors the live CSS on the GitHub Pages site. Each persistent element
// carries a stable id; Framer Motion's shared-layout (FLIP) algorithm
// computes the layout-to-layout delta automatically — no keyframes,
// no per-property animate, no easing math.
//
// The default MORPH_TRANSITION is { duration: 0.7, ease: [0.32, 0.72, 0.34, 1] }.
// Phase boundaries get a 350 ms cross-fade smear cut — see PHASES below.

import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const PHASES = {
  hook:     { startMs:     0, endMs:  4000 },
  brief:    { startMs:  4000, endMs:  8000 },
  composer: { startMs:  8000, endMs: 12000 },
  morph:    { startMs: 12000, endMs: 16000 },
  outputs:  { startMs: 16000, endMs: 20000 },
  examples: { startMs: 20000, endMs: 24000 },
  outro:    { startMs: 24000, endMs: 30000 }
} as const;

export const TOTAL_MS = 30000;
export const SMEAR_MS = 350;

export const STAGES: StageConfig[] = [
  // ===== S1 · HOOK =====
  {
    id: 0,
    name: 'Hook',
    caption: {
      eyebrow:  'CINEMORPH',
      headline: 'your stack already knows everything.',
      sub: ''
    },
    elements: {
      wordmark:    { pos: { left: '50%', top: '48%', width: '40%', height: '20%' }, shape: 'wordmark' },
      'chip-slack':  { pos: { left: '50%', top: '18%', width: '8%',  height: '6%' }, shape: 'connectorChip' },
      'chip-github': { pos: { left: '80%', top: '32%', width: '8%',  height: '6%' }, shape: 'connectorChip' },
      'chip-notion': { pos: { left: '80%', top: '68%', width: '8%',  height: '6%' }, shape: 'connectorChip' },
      'chip-linear': { pos: { left: '20%', top: '68%', width: '8%',  height: '6%' }, shape: 'connectorChip' },
      'chip-drive':  { pos: { left: '20%', top: '32%', width: '8%',  height: '6%' }, shape: 'connectorChip' },
      brief:    HIDDEN, code:     HIDDEN,
      'out-live': HIDDEN, 'out-mp4': HIDDEN, 'out-pptx': HIDDEN,
      'ex-1': HIDDEN, 'ex-2': HIDDEN, 'ex-3': HIDDEN, 'ex-4': HIDDEN,
      'ex-5': HIDDEN, 'ex-6': HIDDEN, 'ex-7': HIDDEN, 'ex-8': HIDDEN,
      install:  HIDDEN
    },
    frames: { hero: true }
  },

  // ===== S2 · BRIEF =====
  {
    id: 1,
    name: 'Brief',
    caption: {
      eyebrow:  '',
      headline: 'give it a brief.',
      sub: ''
    },
    elements: {
      wordmark:    { pos: { left: '50%', top: '16%', width: '20%', height: '8%' },  shape: 'wordmark' },
      brief:       { pos: { left: '50%', top: '50%', width: '60%', height: '18%' }, shape: 'card' },
      'chip-slack':  { pos: { left: '14%', top: '76%', width: '8%', height: '6%' }, shape: 'connectorChip', opacity: 0.55 },
      'chip-github': { pos: { left: '32%', top: '76%', width: '8%', height: '6%' }, shape: 'connectorChip', opacity: 0.55 },
      'chip-notion': { pos: { left: '50%', top: '76%', width: '8%', height: '6%' }, shape: 'connectorChip', opacity: 0.55 },
      'chip-linear': { pos: { left: '68%', top: '76%', width: '8%', height: '6%' }, shape: 'connectorChip', opacity: 0.55 },
      'chip-drive':  { pos: { left: '86%', top: '76%', width: '8%', height: '6%' }, shape: 'connectorChip', opacity: 0.55 },
      code:     HIDDEN,
      'out-live': HIDDEN, 'out-mp4': HIDDEN, 'out-pptx': HIDDEN,
      'ex-1': HIDDEN, 'ex-2': HIDDEN, 'ex-3': HIDDEN, 'ex-4': HIDDEN,
      'ex-5': HIDDEN, 'ex-6': HIDDEN, 'ex-7': HIDDEN, 'ex-8': HIDDEN,
      install:  HIDDEN
    },
    frames: {}
  },

  // ===== S3 · COMPOSER =====
  {
    id: 2,
    name: 'Composer',
    caption: {
      eyebrow:  '',
      headline: 'the composer writes the deck.',
      sub: ''
    },
    elements: {
      wordmark: { pos: { left: '50%', top: '14%', width: '18%', height: '8%' },  shape: 'wordmark' },
      code:     { pos: { left: '50%', top: '56%', width: '70%', height: '40%' }, shape: 'code' },
      brief:    HIDDEN,
      'chip-slack':  HIDDEN, 'chip-github': HIDDEN, 'chip-notion': HIDDEN,
      'chip-linear': HIDDEN, 'chip-drive':  HIDDEN,
      'out-live': HIDDEN, 'out-mp4': HIDDEN, 'out-pptx': HIDDEN,
      'ex-1': HIDDEN, 'ex-2': HIDDEN, 'ex-3': HIDDEN, 'ex-4': HIDDEN,
      'ex-5': HIDDEN, 'ex-6': HIDDEN, 'ex-7': HIDDEN, 'ex-8': HIDDEN,
      install:  HIDDEN
    },
    frames: {}
  },

  // ===== S4 · MORPH (chip dance) =====
  {
    id: 3,
    name: 'Morph',
    caption: {
      eyebrow:  '',
      headline: 'elements morph between stages.',
      sub: ''
    },
    elements: {
      wordmark:    { pos: { left: '50%', top: '14%', width: '18%', height: '8%' }, shape: 'wordmark' },
      'chip-slack':  { pos: { left: '18%', top: '56%', width: '8%', height: '6%' }, shape: 'connectorChip' },
      'chip-github': { pos: { left: '36%', top: '56%', width: '8%', height: '6%' }, shape: 'connectorChip' },
      'chip-notion': { pos: { left: '54%', top: '56%', width: '8%', height: '6%' }, shape: 'connectorChip' },
      'chip-linear': { pos: { left: '72%', top: '56%', width: '8%', height: '6%' }, shape: 'connectorChip' },
      'chip-drive':  { pos: { left: '88%', top: '56%', width: '8%', height: '6%' }, shape: 'connectorChip' },
      code: HIDDEN, brief: HIDDEN,
      'out-live': HIDDEN, 'out-mp4': HIDDEN, 'out-pptx': HIDDEN,
      'ex-1': HIDDEN, 'ex-2': HIDDEN, 'ex-3': HIDDEN, 'ex-4': HIDDEN,
      'ex-5': HIDDEN, 'ex-6': HIDDEN, 'ex-7': HIDDEN, 'ex-8': HIDDEN,
      install:  HIDDEN
    },
    frames: {}
  },

  // ===== S5 · OUTPUTS =====
  {
    id: 4,
    name: 'Outputs',
    caption: {
      eyebrow:  '',
      headline: 'three outputs. one source of truth.',
      sub: ''
    },
    elements: {
      wordmark:   { pos: { left: '50%', top: '14%', width: '18%', height: '8%' },  shape: 'wordmark' },
      'out-live': { pos: { left: '19%', top: '56%', width: '24%', height: '24%' }, shape: 'card' },
      'out-mp4':  { pos: { left: '50%', top: '56%', width: '24%', height: '24%' }, shape: 'card' },
      'out-pptx': { pos: { left: '81%', top: '56%', width: '24%', height: '24%' }, shape: 'card' },
      'chip-slack':  HIDDEN, 'chip-github': HIDDEN, 'chip-notion': HIDDEN,
      'chip-linear': HIDDEN, 'chip-drive':  HIDDEN,
      code: HIDDEN, brief: HIDDEN,
      'ex-1': HIDDEN, 'ex-2': HIDDEN, 'ex-3': HIDDEN, 'ex-4': HIDDEN,
      'ex-5': HIDDEN, 'ex-6': HIDDEN, 'ex-7': HIDDEN, 'ex-8': HIDDEN,
      install:  HIDDEN
    },
    frames: {}
  },

  // ===== S6 · EXAMPLES =====
  {
    id: 5,
    name: 'Examples',
    caption: {
      eyebrow:  '',
      headline: 'twelve starters. yours next.',
      sub: ''
    },
    elements: {
      wordmark: { pos: { left: '50%', top: '14%', width: '18%', height: '8%' },  shape: 'wordmark' },
      'ex-1':   { pos: { left: '25%', top: '38%', width: '20%', height: '8%' }, shape: 'card' },
      'ex-2':   { pos: { left: '50%', top: '38%', width: '20%', height: '8%' }, shape: 'card' },
      'ex-3':   { pos: { left: '75%', top: '38%', width: '20%', height: '8%' }, shape: 'card' },
      'ex-4':   { pos: { left: '25%', top: '54%', width: '20%', height: '8%' }, shape: 'card' },
      'ex-5':   { pos: { left: '50%', top: '54%', width: '20%', height: '8%' }, shape: 'card' },
      'ex-6':   { pos: { left: '75%', top: '54%', width: '20%', height: '8%' }, shape: 'card' },
      'ex-7':   { pos: { left: '33%', top: '70%', width: '20%', height: '8%' }, shape: 'card' },
      'ex-8':   { pos: { left: '67%', top: '70%', width: '20%', height: '8%' }, shape: 'card' },
      'chip-slack':  HIDDEN, 'chip-github': HIDDEN, 'chip-notion': HIDDEN,
      'chip-linear': HIDDEN, 'chip-drive':  HIDDEN,
      code: HIDDEN, brief: HIDDEN,
      'out-live': HIDDEN, 'out-mp4': HIDDEN, 'out-pptx': HIDDEN,
      install:  HIDDEN
    },
    frames: {}
  },

  // ===== S7 · OUTRO =====
  {
    id: 6,
    name: 'Outro',
    caption: {
      eyebrow:  '',
      headline: 'Cinemorph.',
      sub:      'a Claude Code plugin.'
    },
    elements: {
      wordmark: { pos: { left: '50%', top: '32%', width: '50%', height: '20%' }, shape: 'wordmark' },
      install:  { pos: { left: '50%', top: '64%', width: '60%', height: '20%' }, shape: 'card' },
      code: HIDDEN, brief: HIDDEN,
      'chip-slack':  HIDDEN, 'chip-github': HIDDEN, 'chip-notion': HIDDEN,
      'chip-linear': HIDDEN, 'chip-drive':  HIDDEN,
      'out-live': HIDDEN, 'out-mp4': HIDDEN, 'out-pptx': HIDDEN,
      'ex-1': HIDDEN, 'ex-2': HIDDEN, 'ex-3': HIDDEN, 'ex-4': HIDDEN,
      'ex-5': HIDDEN, 'ex-6': HIDDEN, 'ex-7': HIDDEN, 'ex-8': HIDDEN
    },
    frames: {}
  }
];
