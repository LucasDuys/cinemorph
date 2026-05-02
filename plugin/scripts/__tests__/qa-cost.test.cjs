// T009: qa-cost.test.cjs — cost telemetry tests for runQALoop.
// R004: cost estimate before run + actual cost after + $1 confirmation gate.
// Uses node:test. All LLM calls are injected via _evaluateFn / _composeFn.

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const { runQALoop } = require('../qa-runner.cjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-cost-'));
  fs.mkdirSync(path.join(d, '.morph-deck'), { recursive: true });
  return d;
}

function passingEvaluate() {
  return {
    scores: { legibility:9, overlap:9, hierarchy:9, brand:9, composition:9, onbrand:9, cinematic:9, overall:9 },
    issues: [],
  };
}

function makeStages(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `slide-${i + 1}`,
    caption: { headline: `Stage ${i + 1}`, eyebrow: `S${i + 1}` },
  }));
}

// ---------------------------------------------------------------------------
// R004.AC1: cost estimate printed before run
// ---------------------------------------------------------------------------

test('runQALoop prints cost estimate before starting QA', async () => {
  const tmpDir = makeTmpDir();
  const stages = makeStages(3);

  let output = '';
  const _print = (msg) => { output += msg + '\n'; };

  await runQALoop({
    deckPath: tmpDir,
    stages,
    _evaluateFn: passingEvaluate,
    _composeFn:  () => ({ ok: true }),
    _renderFn:   () => {},
    _print,
    _stdin: { question: (_, cb) => cb('y') },
  });

  // Must print estimate with stage count, per-call cost, and total.
  assert.ok(/stage/i.test(output), 'estimate must mention stages');
  assert.ok(/\$0\.0[0-9]|0\.03|\$0\.27/i.test(output), 'estimate must include a dollar amount');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// R004.AC3: 8 stages × (2 retries+1) = $0.72 — no confirm prompt
// ---------------------------------------------------------------------------

test('8 stages x 3 calls each = $0.72 does NOT trigger confirmation prompt', async () => {
  const tmpDir = makeTmpDir();
  const stages = makeStages(8);

  let confirmPromptFired = false;
  const _stdin = {
    question: (msg, cb) => {
      // Any question fired means the confirm prompt was triggered.
      confirmPromptFired = true;
      cb('y');
    },
  };

  await runQALoop({
    deckPath: tmpDir,
    stages,
    _evaluateFn: passingEvaluate,
    _composeFn:  () => ({ ok: true }),
    _renderFn:   () => {},
    _print:      () => {},
    _stdin,
  });

  // $0.72 is under $1 — no prompt expected.
  assert.ok(!confirmPromptFired, '8 stages ($0.72 estimate) must not trigger confirm prompt');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// R004.AC3: 12 stages × (2 retries+1) = $1.08 — confirm prompt fires
// ---------------------------------------------------------------------------

test('12 stages x 3 calls each = $1.08 triggers confirmation prompt', async () => {
  const tmpDir = makeTmpDir();
  const stages = makeStages(12);

  let confirmPromptFired = false;
  const _stdin = {
    question: (msg, cb) => {
      confirmPromptFired = true;
      cb('y'); // User confirms.
    },
  };

  await runQALoop({
    deckPath: tmpDir,
    stages,
    _evaluateFn: passingEvaluate,
    _composeFn:  () => ({ ok: true }),
    _renderFn:   () => {},
    _print:      () => {},
    _stdin,
  });

  // $1.08 exceeds $1 — confirm prompt must fire.
  assert.ok(confirmPromptFired, '12 stages ($1.08 estimate) must trigger confirm prompt');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// R004.AC3: if user declines confirmation, runQALoop aborts early
// ---------------------------------------------------------------------------

test('runQALoop aborts if user declines cost confirmation', async () => {
  const tmpDir = makeTmpDir();
  const stages = makeStages(12); // > $1

  let evaluateCalled = false;
  const _stdin = {
    question: (_msg, cb) => cb('n'), // Decline.
  };

  const result = await runQALoop({
    deckPath: tmpDir,
    stages,
    _evaluateFn: () => { evaluateCalled = true; return passingEvaluate(); },
    _composeFn:  () => ({ ok: true }),
    _renderFn:   () => {},
    _print:      () => {},
    _stdin,
  });

  assert.ok(!evaluateCalled, 'evaluateStage must not be called after user declines');
  assert.ok(result.aborted === true, 'result.aborted must be true after decline');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// R004.AC2: actual cost summary includes call count, retry count
// ---------------------------------------------------------------------------

test('runQALoop prints actual cost summary with call count and retry count', async () => {
  const tmpDir = makeTmpDir();
  const stages = makeStages(2);

  let output = '';
  const _print = (msg) => { output += msg + '\n'; };

  await runQALoop({
    deckPath: tmpDir,
    stages,
    _evaluateFn: passingEvaluate,
    _composeFn:  () => ({ ok: true }),
    _renderFn:   () => {},
    _print,
    _stdin: { question: (_, cb) => cb('y') },
  });

  // Must print call count (2 calls for 2 passing stages).
  assert.ok(/2\s*call|call.*2/i.test(output), 'actual summary must include call count');
  // Must print retry count (0 retries).
  assert.ok(/0\s*retr|retr.*0/i.test(output), 'actual summary must include retry count');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// R004.AC1: QA_COST_PER_CALL env var is configurable
// ---------------------------------------------------------------------------

test('QA_COST_PER_CALL env var overrides default cost per call', async () => {
  const tmpDir = makeTmpDir();
  const stages = makeStages(1);

  let output = '';
  const _print = (msg) => { output += msg + '\n'; };

  const original = process.env.QA_COST_PER_CALL;
  process.env.QA_COST_PER_CALL = '0.10'; // Override to $0.10.

  try {
    await runQALoop({
      deckPath: tmpDir,
      stages,
      _evaluateFn: passingEvaluate,
      _composeFn:  () => ({ ok: true }),
      _renderFn:   () => {},
      _print,
      _stdin: { question: (_, cb) => cb('y') },
    });

    // With 1 stage and $0.10/call, estimate should mention 0.10 or $0.30 (3 calls) or similar.
    assert.ok(/0\.10|0\.30/i.test(output), 'estimate must reflect custom QA_COST_PER_CALL value');
  } finally {
    if (original === undefined) {
      delete process.env.QA_COST_PER_CALL;
    } else {
      process.env.QA_COST_PER_CALL = original;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
