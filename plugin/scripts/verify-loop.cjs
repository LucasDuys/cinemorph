// T016: verify-loop.cjs — build + render verification loop with retry budget.
//
// Usage:
//   const { verifyLoop } = require('./verify-loop.cjs');
//   const result = await verifyLoop({ deckPath, retry, maxRetries: 2 });
//
// `retry` is an async function: async (feedback) => { stagesTs, dataTs }
// The caller (composer harness, T015) supplies it.
//
// Returns:
//   { ok: true,  screenshot: string, deckPath: string }
//   { ok: false, stage: 'build'|'render', errors: string|string[], deckPath: string }

'use strict';

const { verifyBuild } = require('./verify-build.cjs');
const { verifyRender } = require('./verify-render.cjs');

/**
 * Run the build + render verification loop with a shared retry budget.
 *
 * @param {object} params
 * @param {string}   params.deckPath   - Absolute path to the deck directory.
 * @param {function} params.retry      - async (feedback: string) => { stagesTs: string, dataTs: string }
 * @param {number}   [params.maxRetries=2] - Total retry budget shared across build+render.
 * @param {function} [params._runBuild]    - Internal override for testing.
 * @param {function} [params._runRender]   - Internal override for testing.
 * @returns {Promise<
 *   { ok: true,  screenshot: string, deckPath: string } |
 *   { ok: false, stage: 'build'|'render', errors: string|string[], deckPath: string }
 * >}
 */
async function verifyLoop({
  deckPath,
  retry,
  maxRetries = 2,
  _runBuild,
  _runRender,
}) {
  const runBuild  = _runBuild  || (() => verifyBuild(deckPath));
  const runRender = _runRender || (() => verifyRender(deckPath));

  let retriesLeft = maxRetries;

  // ---- Build phase ----
  let buildResult = await Promise.resolve(runBuild());

  while (!buildResult.ok) {
    if (retriesLeft <= 0) {
      return { ok: false, stage: 'build', errors: buildResult.errors, deckPath };
    }
    retriesLeft--;

    // Ask the caller to regenerate files given the build error feedback.
    await retry(buildResult.errors);

    buildResult = await Promise.resolve(runBuild());
  }

  // ---- Render phase ----
  let renderResult = await Promise.resolve(runRender());

  while (!renderResult.ok) {
    if (retriesLeft <= 0) {
      return { ok: false, stage: 'render', errors: renderResult.errors, deckPath };
    }
    retriesLeft--;

    // Format render errors as a string for the retry callback.
    const feedback = Array.isArray(renderResult.errors)
      ? renderResult.errors.join('\n')
      : String(renderResult.errors);

    await retry(feedback);

    // After a render fix the build must also pass again before we re-render.
    buildResult = await Promise.resolve(runBuild());
    if (!buildResult.ok) {
      return { ok: false, stage: 'build', errors: buildResult.errors, deckPath };
    }

    renderResult = await Promise.resolve(runRender());
  }

  return { ok: true, screenshot: renderResult.screenshot, deckPath };
}

module.exports = { verifyLoop };
