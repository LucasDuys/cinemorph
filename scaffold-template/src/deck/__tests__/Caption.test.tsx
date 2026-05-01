// Compile-time + light runtime sanity checks for Caption.tsx. Full DOM
// assertions await an RTL setup; for v0 we assert:
//   1. Caption exports a function component.
//   2. The StageConfig.caption schema supports the {eyebrow, headline, sub?,
//      hidden?} fields the component reads.
//   3. A `caption.hidden === true` stage is structurally valid input.
//   4. AnimatePresence keying lives on stage.id (a number) per the impl.
//
// Authored as .test.tsx so a future vitest pickup runs these as real cases.
// Until then `tsc --noEmit` is the gate (compile success = wiring intact).

import { Caption } from '../Caption';
import { CAPTION_FADE } from '../pace';
import type { StageConfig } from '../stages';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

// 1. Caption is a function component
assert(typeof Caption === 'function', 'Caption must be a function component');

// 2. CAPTION_FADE wired through pace.ts (single source of truth for timing)
assert(CAPTION_FADE.duration === 0.25, 'Caption must use 0.25s CAPTION_FADE from pace.ts');

// 3. A stage with caption.hidden === true is structurally valid.
const hiddenStage: StageConfig = {
  id: 0,
  name: 'hidden-caption',
  caption: { eyebrow: 'EB', headline: 'HL', hidden: true },
  elements: {}
};
assert(hiddenStage.caption.hidden === true, 'caption.hidden flag must be readable on StageConfig');

// 4. A stage with sub copy is also valid; sub is optional.
const subStage: StageConfig = {
  id: 1,
  name: 'with-sub',
  caption: {
    eyebrow: 'INTRO',
    headline: 'A clear, balanced headline',
    sub: 'A longer supporting sentence that wraps at 60ch.'
  },
  elements: {}
};
assert(typeof subStage.caption.sub === 'string', 'caption.sub must be a string when present');

// 5. stage.id is a number — AnimatePresence keying relies on this.
const numericKeyStage: StageConfig = {
  id: 42,
  name: 'numeric-id',
  caption: { eyebrow: 'eb', headline: 'hl' },
  elements: {}
};
assert(typeof numericKeyStage.id === 'number', 'stage.id must be numeric for AnimatePresence keying');

// eslint-disable-next-line no-console
console.log('Caption.test.tsx: all assertions passed');
