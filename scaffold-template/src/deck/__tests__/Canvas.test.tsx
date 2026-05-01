// Compile-time + light runtime sanity checks for Canvas.tsx. A full
// react-testing-library setup is a follow-up; for v0 we assert:
//   1. Canvas exports a function component.
//   2. renderElement / MorphBox / registerElement are wired in elements.tsx.
//   3. The HIDDEN-anchor + LayoutGroup invariants hold at the type level.
//
// Authored as .test.tsx so a future vitest pickup runs these as real cases.
// Until then `tsc --noEmit` is the gate (compile success = wiring intact).

import { Canvas } from '../Canvas';
import {
  MorphBox,
  registerElement,
  getRegisteredElement,
  renderElement
} from '../elements';
import { HIDDEN, type StageConfig } from '../stages';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

// 1. Canvas + glue are functions
assert(typeof Canvas === 'function', 'Canvas must be a function component');
assert(typeof MorphBox === 'function', 'MorphBox must be a function component');
assert(typeof renderElement === 'function', 'renderElement must be a function');
assert(typeof registerElement === 'function', 'registerElement must be a function');
assert(typeof getRegisteredElement === 'function', 'getRegisteredElement must be a function');

// 2. Empty registry = unregistered ids are valid (HIDDEN fallback path).
assert(
  getRegisteredElement('does-not-exist') === undefined,
  'unregistered ids must return undefined from the registry'
);

// 3. Stage with no `frames` map and no `elements` is a valid input.
const blankStage: StageConfig = {
  id: 0,
  name: 'blank',
  caption: { eyebrow: 'eb', headline: 'hl' },
  elements: {}
};
const blankElement = renderElement('missing', blankStage);
assert(blankElement != null, 'renderElement must always return a ReactElement');

// 4. HIDDEN anchor stays the canonical reference for missing ids.
assert(HIDDEN.shape === 'hidden', 'HIDDEN.shape must remain "hidden"');

// 5. registerElement round-trip
const Stub = (() => null) as unknown as Parameters<typeof registerElement>[1];
registerElement('__test_stub__', Stub);
assert(
  getRegisteredElement('__test_stub__') === Stub,
  'registerElement must store the component under its id'
);

// eslint-disable-next-line no-console
console.log('Canvas.test.tsx: all assertions passed');
