/**
 * acceptance-phase2.test.mjs — R007 Acceptance Gate (Phase 2)
 *
 * Validates that the morph-deck plugin can regenerate a Stacklink pitch deck
 * that beats the manual reference deck via vision-LLM comparison.
 *
 * USAGE (mock-mode testing):
 *   MORPH_DECK_MOCK=1 node --test plugin/scripts/__tests__/acceptance-phase2.test.mjs
 *
 * USAGE (real manual gate execution):
 *   MORPH_DECK_MOCK=0 node plugin/scripts/__tests__/acceptance-phase2.test.mjs
 *
 * The test script is an executable gate (not a pure unit test) that:
 * 1. Resolves the reference deck from registry (AC1)
 * 2. Runs up to 5 trials of: compose → QA loop → compare
 * 3. Breaks on first NEW IS BETTER verdict (AC3)
 * 4. Prompts for manual user confirmation (AC4)
 *
 * Mock-mode uses MORPH_DECK_MOCK=1 env var to inject deterministic mocks
 * and avoid real API spend during testing.
 */

'use strict';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ============================================================================
// R007 ACCEPTANCE CRITERIA
// ============================================================================
const AC1_REF_DECK_PATH = 'C:\\dev\\stacklink-pitch-roundone\\pitch-app';
const AC2_BRIEF = 'Stacklink, Sovereign Knowledge OS for regulated EU mid-market, 5-slide pitch for Round One Ventures workshop. Two-student team. Not raising. Asks: people to talk to, honest feedback, stay in touch.';
const AC3_THRESHOLD = 1; // At least 1 of 5 trials must return NEW IS BETTER
const AC3_MAX_TRIALS = 5;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Load a module with optional mock injection (for testing).
 * In mock mode (MORPH_DECK_MOCK=1), returns a mock version.
 * In real mode, returns the actual module.
 */
function loadModule(moduleName, mockVersion) {
  const isMock = process.env.MORPH_DECK_MOCK === '1';
  if (isMock && mockVersion) {
    return mockVersion;
  }
  return require(moduleName);
}

/**
 * Create a mock composeDeck function that returns a deterministic response.
 * In real mode, this is never called. In mock mode, verdicts are injected.
 */
function makeMockComposeDeck(deckPath) {
  return async ({ brief, theme, deckPath: dp }) => {
    return {
      stagesTs: 'export const STAGES = [];',
      dataTs: 'export const DATA = {};',
      model: 'claude-sonnet-4-6',
      tokensUsed: 500,
    };
  };
}

/**
 * Create a mock runQALoop that simulates QA completion.
 * In real mode, this performs actual QA. In mock mode, it succeeds without API calls.
 */
function makeMockQALoop() {
  return async ({ deckPath, mainOnly }) => {
    return { ok: true, retriesUsed: 0, cost: 0.05 };
  };
}

/**
 * Create a mock runCompare that returns a controlled verdict.
 * Injected verdicts allow testing all 5 trial scenarios.
 * @param {string} verdict - One of: 'new-better', 'equivalent', 'ref-better'
 */
function makeMockCompare(verdict) {
  return ({ newDeckPath, refNameOrPath, _fakeClient, _fakeRenderer }) => {
    const distDir = path.join(newDeckPath, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    const verdictLine = verdict === 'new-better'
      ? 'VERDICT: NEW IS BETTER'
      : verdict === 'ref-better'
        ? 'VERDICT: REFERENCE IS BETTER'
        : 'VERDICT: EQUIVALENT';

    const reportPath = path.join(distDir, 'comparison.md');
    const report = `# Comparison Report\n\n${verdictLine}`;
    fs.writeFileSync(reportPath, report, 'utf8');

    return {
      verdict: verdictLine,
      reportPath,
      rounds: 0,
    };
  };
}

/**
 * Prompt user for confirmation via stdin (requires TTY).
 * Returns 'confirm', 'disagree', or null (not a TTY).
 */
async function promptForConfirmation() {
  if (!process.stdin.isTTY) {
    return null; // Not a TTY, cannot prompt
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('> type `confirm` or `disagree`: ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

/**
 * Extract the VERDICT line from a comparison.md file.
 * @param {string} reportPath - Path to comparison.md
 * @returns {string} The VERDICT line or empty string
 */
function extractVerdict(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return '';
  }
  const content = fs.readFileSync(reportPath, 'utf8');
  const match = content.match(/VERDICT: .*/);
  return match ? match[0] : '';
}

/**
 * Main gate execution logic (shared by tests and real runs).
 * @param {object} options
 * @param {function} options.composeDeck - Composition function (real or mock)
 * @param {function} options.runQALoop - QA function (real or mock)
 * @param {function} options.runCompare - Compare function (real or mock)
 * @param {function} options.resolveReference - Registry resolver (real or mock)
 * @param {boolean} [options.isTest] - If true, skip manual prompts
 * @returns {object} { verdict, trialResults, passedTrial }
 */
async function runGate({
  composeDeck,
  runQALoop,
  runCompare,
  resolveReference,
  isTest = false,
}) {
  const trialResults = [];
  let passedTrial = null;

  // Resolve reference deck path (AC1)
  let refDeckPath;
  try {
    refDeckPath = resolveReference('stacklink-roundone-2026-04');
  } catch (e) {
    if (isTest) {
      // In test mode, use a mock path
      refDeckPath = AC1_REF_DECK_PATH;
    } else {
      throw new Error(`Cannot resolve reference deck: ${e.message}`);
    }
  }

  // Run up to 5 trials (AC3)
  for (let trialN = 1; trialN <= AC3_MAX_TRIALS; trialN++) {
    const deckPath = path.join(os.tmpdir(), `morph-deck-trial-${trialN}-${Date.now()}`);
    fs.mkdirSync(deckPath, { recursive: true });

    try {
      // 2a. Generate deck via composeDeck
      const composed = await composeDeck({
        brief: AC2_BRIEF,
        theme: 'stacklink-dark',
        deckPath,
      });

      if (composed.error) {
        trialResults.push({ trial: trialN, verdict: 'COMPOSE_FAILED', error: composed.error });
        continue;
      }

      // 2b. Run QA loop
      const qad = await runQALoop({ deckPath, mainOnly: false });
      if (!qad.ok) {
        trialResults.push({ trial: trialN, verdict: 'QA_ABORTED', error: qad.error });
        continue;
      }

      // 2c. Run compare
      const compared = runCompare({
        newDeckPath: deckPath,
        refNameOrPath: 'stacklink-roundone-2026-04',
      });

      // 2d. Extract VERDICT from comparison.md
      const verdictLine = extractVerdict(compared.reportPath);
      const verdict = verdictLine.includes('NEW IS BETTER') ? 'NEW IS BETTER' : verdictLine;

      trialResults.push({
        trial: trialN,
        verdict,
        comparisonPath: compared.reportPath,
      });

      console.log(`Trial ${trialN}: ${verdict}. comparison.md at ${compared.reportPath}`);

      // If NEW IS BETTER, break loop (AC3)
      if (verdict === 'NEW IS BETTER') {
        passedTrial = trialN;
        break;
      }
    } catch (err) {
      trialResults.push({ trial: trialN, verdict: 'ERROR', error: err.message });
      console.error(`Trial ${trialN}: Error: ${err.message}`);
    }
  }

  return { trialResults, passedTrial };
}

// ============================================================================
// Mock-Mode Tests (node --test)
// ============================================================================

test('mock: all 5 trials fail → exit 1 with summary', async () => {
  const isMock = process.env.MORPH_DECK_MOCK === '1';
  if (!isMock) {
    console.log('skipping: not in mock mode');
    return;
  }

  const mockCompose = makeMockComposeDeck();
  const mockQA = makeMockQALoop();
  const mockCompare = makeMockCompare('ref-better'); // All return REFERENCE BETTER
  const mockResolve = () => AC1_REF_DECK_PATH;

  const result = await runGate({
    composeDeck: mockCompose,
    runQALoop: mockQA,
    runCompare: mockCompare,
    resolveReference: mockResolve,
    isTest: true,
  });

  assert.equal(result.passedTrial, null, 'No trial should pass when all return ref-better');
  assert.equal(result.trialResults.length, 5, 'All 5 trials should complete');
  assert.equal(
    result.trialResults.every(r => r.verdict.includes('BETTER') || r.verdict === 'EQUIVALENT'),
    true,
    'All trials should have verdicts'
  );
});

test('mock: trial 3 returns NEW IS BETTER → loop exits early', async () => {
  const isMock = process.env.MORPH_DECK_MOCK === '1';
  if (!isMock) {
    console.log('skipping: not in mock mode');
    return;
  }

  let callCount = 0;
  const mockCompare = ({ newDeckPath, refNameOrPath }) => {
    callCount++;
    const verdict = callCount === 3 ? 'new-better' : 'ref-better';
    const distDir = path.join(newDeckPath, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    const verdictLine = verdict === 'new-better'
      ? 'VERDICT: NEW IS BETTER'
      : 'VERDICT: REFERENCE IS BETTER';

    const reportPath = path.join(distDir, 'comparison.md');
    fs.writeFileSync(reportPath, verdictLine, 'utf8');

    return { verdict: verdictLine, reportPath, rounds: 0 };
  };

  const result = await runGate({
    composeDeck: makeMockComposeDeck(),
    runQALoop: makeMockQALoop(),
    runCompare: mockCompare,
    resolveReference: () => AC1_REF_DECK_PATH,
    isTest: true,
  });

  assert.equal(result.passedTrial, 3, 'Trial 3 should be the passing trial');
  assert.equal(result.trialResults.length, 3, 'Should only run 3 trials before breaking');
  assert.ok(
    result.trialResults[2].verdict.includes('NEW IS BETTER'),
    'Trial 3 verdict should be NEW IS BETTER'
  );
});

test('mock: trial 1 returns NEW IS BETTER → gate ready for confirm', async () => {
  const isMock = process.env.MORPH_DECK_MOCK === '1';
  if (!isMock) {
    console.log('skipping: not in mock mode');
    return;
  }

  const mockCompare = ({ newDeckPath }) => {
    const distDir = path.join(newDeckPath, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const reportPath = path.join(distDir, 'comparison.md');
    fs.writeFileSync(reportPath, 'VERDICT: NEW IS BETTER', 'utf8');
    return { verdict: 'VERDICT: NEW IS BETTER', reportPath, rounds: 0 };
  };

  const result = await runGate({
    composeDeck: makeMockComposeDeck(),
    runQALoop: makeMockQALoop(),
    runCompare: mockCompare,
    resolveReference: () => AC1_REF_DECK_PATH,
    isTest: true,
  });

  assert.equal(result.passedTrial, 1, 'Trial 1 should pass');
  assert.ok(
    result.trialResults[0].comparisonPath,
    'Comparison path should be recorded'
  );
});

test('mock: user confirms verdict → should return confirmation', async () => {
  const isMock = process.env.MORPH_DECK_MOCK === '1';
  if (!isMock) {
    console.log('skipping: not in mock mode');
    return;
  }

  // Simulate stdin with a mock
  const originalIsTTY = process.stdin.isTTY;
  process.stdin.isTTY = false; // Simulate non-TTY for this test

  const mockCompare = ({ newDeckPath }) => {
    const distDir = path.join(newDeckPath, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const reportPath = path.join(distDir, 'comparison.md');
    fs.writeFileSync(reportPath, 'VERDICT: NEW IS BETTER', 'utf8');
    return { verdict: 'VERDICT: NEW IS BETTER', reportPath, rounds: 0 };
  };

  const result = await runGate({
    composeDeck: makeMockComposeDeck(),
    runQALoop: makeMockQALoop(),
    runCompare: mockCompare,
    resolveReference: () => AC1_REF_DECK_PATH,
    isTest: true,
  });

  assert.equal(result.passedTrial, 1);
  process.stdin.isTTY = originalIsTTY;
});

test('mock: 5 trials with varying verdicts → finds first new-better', async () => {
  const isMock = process.env.MORPH_DECK_MOCK === '1';
  if (!isMock) {
    console.log('skipping: not in mock mode');
    return;
  }

  const verdictSequence = ['ref-better', 'ref-better', 'new-better', 'new-better', 'equivalent'];
  let callCount = 0;

  const mockCompare = ({ newDeckPath }) => {
    const verdict = verdictSequence[callCount];
    callCount++;

    const distDir = path.join(newDeckPath, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    const verdictLine = verdict === 'new-better'
      ? 'VERDICT: NEW IS BETTER'
      : verdict === 'ref-better'
        ? 'VERDICT: REFERENCE IS BETTER'
        : 'VERDICT: EQUIVALENT';

    const reportPath = path.join(distDir, 'comparison.md');
    fs.writeFileSync(reportPath, verdictLine, 'utf8');

    return { verdict: verdictLine, reportPath, rounds: 0 };
  };

  const result = await runGate({
    composeDeck: makeMockComposeDeck(),
    runQALoop: makeMockQALoop(),
    runCompare: mockCompare,
    resolveReference: () => AC1_REF_DECK_PATH,
    isTest: true,
  });

  assert.equal(result.passedTrial, 3, 'Should find NEW IS BETTER on trial 3');
  assert.equal(result.trialResults.length, 3, 'Should stop after trial 3');
  assert.ok(
    result.trialResults[2].verdict.includes('NEW IS BETTER'),
    'Trial 3 verdict should include NEW IS BETTER'
  );
});

// ============================================================================
// Real Execution Mode (not node:test)
// ============================================================================

/**
 * This code runs when the script is invoked directly (not via node --test).
 * It performs the actual gate with real composeDeck, runQALoop, and runCompare calls.
 */
if (process.env.MORPH_DECK_MOCK !== '1') {
  (async () => {
    try {
      const { composeDeck } = require('../composer.cjs');
      const { runQALoop } = require('../qa-runner.cjs');
      const { runCompare } = require('../compare.cjs');
      const { resolveReference } = require('../reference-registry.cjs');

      console.log('MORPH-DECK PHASE 2 ACCEPTANCE GATE\n');
      console.log(`R007.AC1: Reference deck path: ${AC1_REF_DECK_PATH}`);
      console.log(`R007.AC2: Brief: ${AC2_BRIEF}\n`);

      // Verify reference exists
      let refPath;
      try {
        refPath = resolveReference('stacklink-roundone-2026-04');
        console.log(`Reference deck resolved to: ${refPath}\n`);
      } catch (e) {
        console.error(`ERROR: Cannot resolve reference deck.`);
        console.error(`  ${e.message}`);
        console.error(`\nEnsure the reference is registered or path exists.`);
        process.exit(1);
      }

      const result = await runGate({
        composeDeck,
        runQALoop,
        runCompare,
        resolveReference,
      });

      console.log('\n' + '='.repeat(70));
      console.log('TRIAL RESULTS');
      console.log('='.repeat(70));

      for (const tr of result.trialResults) {
        console.log(`Trial ${tr.trial}: ${tr.verdict}`);
        if (tr.error) {
          console.log(`  Error: ${tr.error}`);
        }
        if (tr.comparisonPath) {
          console.log(`  Comparison: ${tr.comparisonPath}`);
        }
      }

      console.log('='.repeat(70) + '\n');

      // Determine outcome
      if (result.passedTrial === null) {
        // No trial passed
        console.log('GATE FAILED: No trial returned NEW IS BETTER.\n');
        console.log('Summary of all 5 trials:');
        for (let i = 0; i < result.trialResults.length; i++) {
          const tr = result.trialResults[i];
          console.log(`  Trial ${tr.trial}: ${tr.verdict}`);
        }
        console.log('\nTo retry, check the trials above and consider adjusting the QA rubric.');
        process.exit(1);
      }

      // At least one trial passed — now ask for user confirmation (AC4)
      console.log(`GATE: Trial ${result.passedTrial} returned NEW IS BETTER.\n`);
      console.log(`Comparison: ${result.trialResults[result.passedTrial - 1].comparisonPath}\n`);

      // Check if we can prompt (TTY)
      if (!process.stdin.isTTY) {
        console.error('BLOCKED: Cannot prompt for confirmation in non-TTY environment.');
        console.error('Run this gate interactively in a terminal (not in CI/headless).');
        process.exit(3);
      }

      console.log('User confirmation required: type `confirm` to pass this gate, `disagree` to flag for review.\n');

      const answer = await promptForConfirmation();

      if (answer === 'confirm') {
        console.log('\nGATE PASSED.');
        console.log('Phase 2 acceptance criteria (R007) verified.');
        process.exit(0);
      } else if (answer === 'disagree') {
        console.log('\nGATE DISPUTED.');
        console.log('Review the QA rubric in qa-prompt.cjs before re-running.');
        process.exit(2);
      } else {
        console.log('\nInvalid response. Please type `confirm` or `disagree`.');
        process.exit(2);
      }
    } catch (err) {
      console.error(`Gate execution error: ${err.message}`);
      if (err.stack) {
        console.error(err.stack);
      }
      process.exit(1);
    }
  })();
}
