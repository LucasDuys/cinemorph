// T016: verify-loop.test.cjs — unit tests for the build+render verification loop.
//
// Uses node:test. Mocks verifyBuild + verifyRender via _runBuild/_runRender injection.
// No real bun, tsc, or Playwright is invoked.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { verifyLoop } = require('../verify-loop.cjs');

const DECK_PATH = '/tmp/fake-deck';

// Helper: build a mock that returns results in order, then repeats the last.
function mockSequence(...results) {
  let i = 0;
  return () => {
    const r = results[Math.min(i, results.length - 1)];
    i++;
    return Promise.resolve(r);
  };
}

// Helper: a retry callback that records calls and does nothing (files already injected via mocks).
function noopRetry() {
  const calls = [];
  async function retry(feedback) {
    calls.push(feedback);
  }
  retry.calls = calls;
  return retry;
}

// ---- Tests ----

test('success path: build passes, render passes — returns ok + screenshot', async () => {
  const runBuild  = mockSequence({ ok: true });
  const runRender = mockSequence({ ok: true, screenshot: `${DECK_PATH}/dist/preview-stage-1.png` });
  const retry = noopRetry();

  const result = await verifyLoop({ deckPath: DECK_PATH, retry, maxRetries: 2, _runBuild: runBuild, _runRender: runRender });

  assert.equal(result.ok, true);
  assert.equal(result.screenshot, `${DECK_PATH}/dist/preview-stage-1.png`);
  assert.equal(result.deckPath, DECK_PATH);
  assert.equal(retry.calls.length, 0, 'retry should not be called on clean pass');
});

test('build-fails-then-succeeds: one retry consumed, render then passes', async () => {
  const runBuild  = mockSequence(
    { ok: false, errors: 'TS2345: argument type mismatch' },
    { ok: true }
  );
  const runRender = mockSequence({ ok: true, screenshot: `${DECK_PATH}/dist/preview-stage-1.png` });
  const retry = noopRetry();

  const result = await verifyLoop({ deckPath: DECK_PATH, retry, maxRetries: 2, _runBuild: runBuild, _runRender: runRender });

  assert.equal(result.ok, true);
  assert.equal(retry.calls.length, 1);
  assert.ok(retry.calls[0].includes('TS2345'), 'retry feedback should contain build error');
});

test('render-fails-then-succeeds: one retry consumed on render error', async () => {
  const runBuild  = mockSequence({ ok: true }, { ok: true });
  const runRender = mockSequence(
    { ok: false, errors: ['Uncaught ReferenceError: STAGES is not defined'] },
    { ok: true, screenshot: `${DECK_PATH}/dist/preview-stage-1.png` }
  );
  const retry = noopRetry();

  const result = await verifyLoop({ deckPath: DECK_PATH, retry, maxRetries: 2, _runBuild: runBuild, _runRender: runRender });

  assert.equal(result.ok, true);
  assert.equal(retry.calls.length, 1);
  assert.ok(retry.calls[0].includes('Uncaught ReferenceError'), 'retry feedback should include console error');
});

test('retry-budget-exhausted on build: returns ok:false with stage=build', async () => {
  const buildError = 'Cannot find module ./stages';
  const runBuild  = mockSequence({ ok: false, errors: buildError });
  const runRender = mockSequence({ ok: true, screenshot: `${DECK_PATH}/dist/preview-stage-1.png` });
  const retry = noopRetry();

  const result = await verifyLoop({ deckPath: DECK_PATH, retry, maxRetries: 1, _runBuild: runBuild, _runRender: runRender });

  // maxRetries=1: first failure consumes the one retry; second failure exhausts budget.
  assert.equal(result.ok, false);
  assert.equal(result.stage, 'build');
  assert.equal(result.deckPath, DECK_PATH);
  assert.equal(result.errors, buildError);
  assert.equal(retry.calls.length, 1);
});

test('retry-budget-exhausted on render: returns ok:false with stage=render', async () => {
  const runBuild  = mockSequence({ ok: true });
  const renderError = ['page error: Cannot read properties of undefined'];
  const runRender = mockSequence({ ok: false, errors: renderError });
  const retry = noopRetry();

  // maxRetries=0: no retries allowed, any failure is immediate.
  const result = await verifyLoop({ deckPath: DECK_PATH, retry, maxRetries: 0, _runBuild: runBuild, _runRender: runRender });

  assert.equal(result.ok, false);
  assert.equal(result.stage, 'render');
  assert.deepEqual(result.errors, renderError);
  assert.equal(retry.calls.length, 0);
});

test('second build after render retry fails: returns ok:false with stage=build', async () => {
  // Render fails once, retry is called, but then the second build fails too.
  const runBuild  = mockSequence(
    { ok: true },                          // initial build passes
    { ok: false, errors: 'New TS error after retry' }  // post-retry build fails
  );
  const runRender = mockSequence(
    { ok: false, errors: ['console error after first render'] }
  );
  const retry = noopRetry();

  const result = await verifyLoop({ deckPath: DECK_PATH, retry, maxRetries: 2, _runBuild: runBuild, _runRender: runRender });

  assert.equal(result.ok, false);
  assert.equal(result.stage, 'build');
  assert.ok(result.errors.includes('New TS error after retry'));
});

test('maxRetries=2 default: both build and render each get a chance to retry', async () => {
  // Build fails once (uses 1 retry), then passes.
  // Render fails once (uses 1 retry), then passes.
  const runBuild  = mockSequence(
    { ok: false, errors: 'build error 1' },
    { ok: true },  // after build retry
    { ok: true }   // after render retry re-check
  );
  const runRender = mockSequence(
    { ok: false, errors: ['render error 1'] },
    { ok: true, screenshot: `${DECK_PATH}/dist/preview-stage-1.png` }
  );
  const retry = noopRetry();

  const result = await verifyLoop({ deckPath: DECK_PATH, retry, maxRetries: 2, _runBuild: runBuild, _runRender: runRender });

  assert.equal(result.ok, true);
  assert.equal(retry.calls.length, 2);
});
