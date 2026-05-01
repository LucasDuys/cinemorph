// Schema test for stages.ts. Verifies HIDDEN constants, resolveLayout
// fallback behavior, STAGES default, and Shape type union coverage.
// Authored as .test.ts for future vitest pickup; for now, `tsc --noEmit`
// is the gate (compile success = schema valid).

import {
  HIDDEN,
  STAGES,
  resolveLayout,
  type ElementLayout,
  type Shape,
  type StageConfig
} from '../stages';

// --- Runtime assertions ----------------------------------------------------

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

// 1. HIDDEN shape contract
assert(HIDDEN.pos.width === '0%', 'HIDDEN.pos.width must be 0%');
assert(HIDDEN.pos.height === '0%', 'HIDDEN.pos.height must be 0%');
assert(HIDDEN.pos.left === '50%', 'HIDDEN.pos.left must be 50%');
assert(HIDDEN.pos.top === '50%', 'HIDDEN.pos.top must be 50%');
assert(HIDDEN.opacity === 0, 'HIDDEN.opacity must be 0');
assert(HIDDEN.shape === 'hidden', 'HIDDEN.shape must be "hidden"');

// 2. STAGES default
assert(Array.isArray(STAGES), 'STAGES must be an array');
assert(STAGES.length === 0, 'STAGES must be empty in default scaffold');

// 3. resolveLayout fallback to HIDDEN by reference equality
const sampleLayout: ElementLayout = {
  pos: { left: '10%', top: '20%', width: '30%', height: '40%' },
  shape: 'hero',
  opacity: 1
};
const stage: StageConfig = {
  id: 1,
  name: 'sample',
  caption: { eyebrow: 'eb', headline: 'hl' },
  elements: { present: sampleLayout }
};

const missing = resolveLayout(stage, 'missing');
assert(missing === HIDDEN, 'resolveLayout must return HIDDEN by reference for missing ids');

const present = resolveLayout(stage, 'present');
assert(present === sampleLayout, 'resolveLayout must return the actual layout for present ids');
assert(present.shape === 'hero', 'resolved present layout must keep its shape');

// 4. Shape type union — compile-time + runtime sample
const shapes: Shape[] = ['hero', 'orbit', 'pipeline', 'footer', 'cluster', 'hidden'];
assert(shapes.length === 6, 'Shape union sample must include 6 representative shapes');

// 5. Negative type check: a non-Shape string must not be assignable to Shape.
// @ts-expect-error -- 'banana' is not in the Shape union
const badShape: Shape = 'banana';
void badShape;

// eslint-disable-next-line no-console
console.log('stages.schema.test.ts: all assertions passed');
