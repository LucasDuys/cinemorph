// T006: qa-runner.cjs — vision-QA model client.
// T009: retry loop + cost telemetry + --no-qa flag.
//
// Calls the Claude CLI with a vision prompt and returns structured QA scores.
// runQALoop orchestrates the full per-stage QA + retry cycle.
//
// Usage:
//   const { evaluateStage, runQALoop, composeStageRevision } = require('./qa-runner.cjs');
//   const result = await evaluateStage({ pngPath, stageName, captionText, tokens, model? });
//   const loopResult = await runQALoop({ deckPath, stages, mainOnly, noQa, dryRun });
//
// Returns from evaluateStage: { scores: {...}, issues: [] }
// Returns from runQALoop: { skipped?, aborted?, userAction?, callCount, retryCount, estimatedCost, actualCost }
// Throws on malformed response or CLI failure.

'use strict';

const cp   = require('node:child_process');
const fs   = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const { buildSystemPrompt, buildUserPrompt } = require('./qa-prompt.cjs');

// Default model: cheapest vision-capable Sonnet at time of writing.
// Override via QA_MODEL env var.
const DEFAULT_QA_MODEL = 'claude-sonnet-4-5';

// Wall time for a single QA call (vision calls can be slow on large images).
const WALL_TIME_MS = 120_000; // 2 minutes

// ---------------------------------------------------------------------------
// T009 constants
// ---------------------------------------------------------------------------

// Cost per QA API call in USD. Override via QA_COST_PER_CALL env var.
const QA_COST_PER_CALL = process.env.QA_COST_PER_CALL
  ? parseFloat(process.env.QA_COST_PER_CALL)
  : 0.03;

// Maximum retries per individual stage before escalating.
const MAX_STAGE_RETRIES = 2;

// Maximum total retries across the entire deck.
const MAX_DECK_RETRIES = 6;

// Minimum overall score to pass QA without triggering a retry.
const THRESHOLD = 7;

/**
 * Extract a JSON object from raw LLM output.
 * Strips markdown fences, finds first { ... }.
 *
 * @param {string} raw - Raw CLI stdout.
 * @returns {string} JSON string.
 * @throws {Error} If no JSON object found.
 */
function extractJson(raw) {
  let cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `qa-runner: malformed response — no JSON object found. ` +
      `Raw output (first 400 chars): ${raw.slice(0, 400)}`
    );
  }
  return cleaned.slice(start, end + 1);
}

/**
 * Validate the parsed QA response object has the required shape.
 *
 * @param {object} obj - Parsed JSON object.
 * @throws {Error} With a descriptive message if validation fails.
 */
function validateQaResponse(obj) {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('qa-runner: invalid response schema — root value is not an object');
  }

  // Validate scores field.
  if (!('scores' in obj)) {
    throw new Error('qa-runner: invalid response schema — missing required "scores" field');
  }
  const { scores } = obj;
  if (typeof scores !== 'object' || scores === null) {
    throw new Error('qa-runner: invalid response schema — "scores" must be an object');
  }

  const requiredScoreKeys = [
    'legibility', 'overlap', 'hierarchy', 'brand',
    'composition', 'onbrand', 'cinematic', 'overall',
  ];
  for (const key of requiredScoreKeys) {
    if (!(key in scores)) {
      throw new Error(`qa-runner: invalid response schema — "scores.${key}" is missing`);
    }
    if (typeof scores[key] !== 'number') {
      throw new Error(`qa-runner: invalid response schema — "scores.${key}" must be a number, got ${typeof scores[key]}`);
    }
  }

  // Validate issues field.
  if (!('issues' in obj)) {
    throw new Error('qa-runner: invalid response schema — missing required "issues" field');
  }
  if (!Array.isArray(obj.issues)) {
    throw new Error('qa-runner: invalid response schema — "issues" must be an array');
  }
}

/**
 * Evaluate a single stage PNG against the 7-axis QA rubric.
 *
 * @param {object} params
 * @param {string}  params.pngPath       - Absolute path to the stage PNG.
 * @param {string}  params.stageName     - Stage identifier (e.g. "slide-1").
 * @param {string}  params.captionText   - Headline / caption for this stage.
 * @param {object}  params.tokens        - Resolved design tokens (hex values).
 * @param {string}  [params.model]       - Override model. QA_MODEL env var takes precedence.
 * @param {string}  [params._fakeClaudeBin] - Internal: path to stub CLI for testing.
 *
 * @returns {{ scores: object, issues: Array }} Structured QA result.
 * @throws {Error} If the PNG > 5 MB, CLI fails, or response is malformed.
 */
function evaluateStage({
  pngPath,
  stageName,
  captionText,
  tokens,
  model,
  _fakeClaudeBin,
}) {
  // Build user prompt (throws if PNG > 5MB or not found).
  const userContent = buildUserPrompt({ pngPath, stageName, captionText, tokens });

  // Build system prompt.
  const systemPrompt = buildSystemPrompt();

  // Resolve model — env var takes precedence over param, then default.
  const resolvedModel = process.env.QA_MODEL || model || DEFAULT_QA_MODEL;

  // Resolve Claude binary.
  // For tests, _fakeClaudeBin may be a .js script path; in that case spawn it
  // via the current Node executable to ensure it runs on Windows without a shell.
  const fakeRaw = _fakeClaudeBin || process.env.MORPH_DECK_FAKE_CLAUDE || null;
  const claudeBin = fakeRaw || 'claude';

  // Serialize the user content array as a JSON string to pass as the prompt.
  // The claude CLI -p flag accepts a plain text prompt; for vision we pass a
  // JSON-encoded content array so the CLI can interpret image blocks.
  const promptJson = JSON.stringify(userContent);

  const cliArgs = [
    '-p', promptJson,
    '--system-prompt', systemPrompt,
    '--output-format', 'text',
    '--model', resolvedModel,
  ];

  // If the fake bin is a .js file, prefix the spawn with process.execPath.
  let spawnBin;
  let args;
  if (fakeRaw && fakeRaw.endsWith('.js')) {
    spawnBin = process.execPath;
    args = [fakeRaw, ...cliArgs];
  } else {
    spawnBin = claudeBin;
    args = cliArgs;
  }

  let spawnResult;
  try {
    spawnResult = cp.spawnSync(spawnBin, args, {
      input: '',
      timeout: WALL_TIME_MS,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    throw new Error(`qa-runner: failed to spawn claude CLI: ${err.message}`);
  }

  // Timeout.
  if (spawnResult.status === null && spawnResult.signal === 'SIGTERM') {
    throw new Error(`qa-runner: wall-time budget (${WALL_TIME_MS / 1000}s) exceeded for stage "${stageName}"`);
  }

  // Non-zero exit.
  if (spawnResult.status !== 0) {
    const stderr = spawnResult.stderr || '';
    throw new Error(
      `qa-runner: claude CLI exited ${spawnResult.status} for stage "${stageName}". ` +
      `stderr: ${stderr.slice(0, 500)}`
    );
  }

  const rawOutput = spawnResult.stdout || '';

  // Extract and parse JSON.
  let parsed;
  try {
    const jsonStr = extractJson(rawOutput);
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `qa-runner: malformed JSON in QA response for stage "${stageName}": ${err.message}`
    );
  }

  // Validate schema.
  validateQaResponse(parsed);

  return {
    scores: parsed.scores,
    issues: parsed.issues,
  };
}

// ---------------------------------------------------------------------------
// T009: composeStageRevision — calls composer.cjs in single-stage diff mode
// ---------------------------------------------------------------------------

/**
 * Ask the composer to revise a single failing stage.
 * Calls composer.cjs with the issues fed back as clarifications.
 *
 * @param {object} params
 * @param {string}   params.stageId            - The stage identifier (e.g. "slide-2").
 * @param {Array}    params.issues             - QA issues array from the failing evaluation.
 * @param {object}   params.currentStageEntry  - The stage's current config object.
 * @param {string}   params.deckPath           - Absolute path to the deck directory.
 * @param {string}   [params._fakeClaudeBin]   - Internal: path to stub CLI for testing.
 * @param {function} [params._composeFn]       - Internal: override composeDeck for testing.
 * @returns {{ ok: boolean, error?: string }}
 */
function composeStageRevision({
  stageId,
  issues,
  currentStageEntry,
  deckPath,
  _fakeClaudeBin,
  _composeFn,
}) {
  const composeFn = _composeFn || (() => {
    const { composeDeck } = require('./composer.cjs');
    const issueLines = issues.map(
      (iss) => `- [${iss.severity}] ${iss.what} (${iss.where}): ${iss.fix_suggestion}`
    ).join('\n');

    // Read existing stages source so composer can apply a targeted diff.
    let stagesTs = '';
    const stagesPath = path.join(deckPath, 'src', 'deck', 'stages.ts');
    try { stagesTs = fs.readFileSync(stagesPath, 'utf8'); } catch { /* no-op */ }

    const clarifications = [
      `Revise ONLY stage "${stageId}". Do not change any other stage.`,
      `The following QA issues were found on this stage:`,
      issueLines,
      `Current stage entry for reference:`,
      JSON.stringify(currentStageEntry, null, 2),
    ].join('\n');

    return composeDeck({
      brief: `Fix QA issues for stage "${stageId}"`,
      tokens: {},
      deckPath,
      clarifications,
      dslDraft: stagesTs,
      _fakeClaudeBin,
    });
  });

  try {
    const result = composeFn({ stageId, issues, currentStageEntry, deckPath });
    if (result && result.error) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

// ---------------------------------------------------------------------------
// T009: appendQaHistory — write one JSONL entry to <deck>/.morph-deck/qa-history.jsonl
// ---------------------------------------------------------------------------

/**
 * Append a QA history entry to <deck>/.morph-deck/qa-history.jsonl.
 *
 * @param {string} deckPath - Absolute path to the deck directory.
 * @param {object} entry    - JSON-serializable history entry.
 */
function appendQaHistory(deckPath, entry) {
  const dir  = path.join(deckPath, '.morph-deck');
  const file = path.join(dir, 'qa-history.jsonl');
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');
}

// ---------------------------------------------------------------------------
// T009: promptUser — ask user a question via stdin readline or injected _stdin
// ---------------------------------------------------------------------------

/**
 * Prompt the user for input. Returns a Promise<string>.
 *
 * @param {string}   prompt  - Question text to display.
 * @param {object}   _stdin  - Injected readline-like object for testing.
 *                             Must have a `question(prompt, callback)` method.
 * @returns {Promise<string>} Trimmed user answer.
 */
function promptUser(prompt, _stdin) {
  if (_stdin && typeof _stdin.question === 'function') {
    return new Promise((resolve) => {
      _stdin.question(prompt, (answer) => resolve((answer || '').trim()));
    });
  }

  // Real TTY path.
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve((answer || '').trim());
    });
  });
}

// ---------------------------------------------------------------------------
// T009: runQALoop — full QA orchestration with retry + cost telemetry
// ---------------------------------------------------------------------------

/**
 * Run the full QA self-loop on a deck.
 *
 * @param {object}   params
 * @param {string}   params.deckPath        - Absolute path to deck directory.
 * @param {Array}    [params.stages]        - Stage configs; if omitted, read from stages.json sidecar.
 * @param {boolean}  [params.mainOnly]      - Exclude backup stages.
 * @param {boolean}  [params.noQa]          - Skip QA entirely (--no-qa flag).
 * @param {boolean}  [params.dryRun]        - Dry-run mode (no real API calls).
 * @param {function} [params._evaluateFn]   - Override evaluateStage for testing.
 * @param {function} [params._composeFn]    - Override composeStageRevision for testing.
 * @param {function} [params._renderFn]     - Override render-stages subprocess for testing.
 * @param {function} [params._print]        - Override console.log for testing.
 * @param {object}   [params._stdin]        - Override stdin readline for testing.
 * @param {string}   [params._fakeClaudeBin] - Pass through to evaluateStage for testing.
 *
 * @returns {Promise<{ skipped?, aborted?, userAction?, callCount, retryCount, estimatedCost, actualCost }>}
 */
async function runQALoop({
  deckPath,
  stages: stagesArg,
  mainOnly = false,
  noQa = false,
  dryRun = false,
  _evaluateFn,
  _composeFn,
  _renderFn,
  _print,
  _stdin,
  _fakeClaudeBin,
}) {
  const print = _print || ((msg) => console.log(msg));

  // R004.AC4: --no-qa flag exits immediately.
  if (noQa) {
    print('QA skipped (--no-qa). Manual review only.');
    return { skipped: true, callCount: 0, retryCount: 0, estimatedCost: 0, actualCost: 0 };
  }

  // Resolve stages: use injected or read from sidecar.
  let stages = stagesArg;
  if (!stages) {
    stages = loadStagesFromDeck(deckPath, mainOnly);
  } else if (mainOnly) {
    stages = stages.filter((s) => !s.backup);
  }

  if (!stages || stages.length === 0) {
    print('qa-runner: no stages found. Nothing to evaluate.');
    return { skipped: true, callCount: 0, retryCount: 0, estimatedCost: 0, actualCost: 0 };
  }

  const stageCount = stages.length;

  // R004.AC1: compute and print cost estimate.
  // Re-read QA_COST_PER_CALL at runtime so env var overrides work in the same process.
  const costPerCall = process.env.QA_COST_PER_CALL
    ? parseFloat(process.env.QA_COST_PER_CALL)
    : QA_COST_PER_CALL;

  const maxCallsPerStage = MAX_STAGE_RETRIES + 1;
  const estimatedCost = stageCount * costPerCall * maxCallsPerStage;
  const estStr = estimatedCost.toFixed(2);
  print(
    `${stageCount} stages × ~$${costPerCall.toFixed(2)} per call × ${maxCallsPerStage} = ~$${estStr} total`
  );

  // R004.AC3: if estimate > $1, prompt for confirmation.
  if (estimatedCost > 1.00) {
    const isTty = process.stdout.isTTY;
    const shouldPrompt = isTty || (_stdin && typeof _stdin.question === 'function');
    if (shouldPrompt) {
      const answer = await promptUser(
        `Estimated cost $${estStr} exceeds $1.00. Continue? (y/n): `,
        _stdin
      );
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        print('QA aborted by user.');
        return { aborted: true, callCount: 0, retryCount: 0, estimatedCost, actualCost: 0 };
      }
    }
  }

  // R001: render stages to PNGs.
  const renderFn = _renderFn || (() => {
    cp.spawnSync(process.execPath, [
      path.join(__dirname, '..', 'render-stages.mjs'),
      deckPath,
      ...(mainOnly ? ['--main-only'] : []),
    ], { encoding: 'utf8', timeout: 120_000 });
  });
  renderFn({ deckPath, mainOnly });

  // Per-stage QA loop.
  const evaluateFn = _evaluateFn || evaluateStage;
  const composeFn  = _composeFn;

  let callCount   = 0;
  let retryCount  = 0;
  let deckBudget  = MAX_DECK_RETRIES;
  const failingStages = [];

  for (const stage of stages) {
    const stageId     = stage.id || stage.name || String(stage);
    const captionText = stage.caption
      ? (stage.caption.headline || stage.caption.eyebrow || '')
      : stageId;
    const pngPath = path.join(deckPath, 'dist', 'qa', `stage-${stageId}.png`);

    let attempt = 0;
    let stageRetries = 0;
    let stagePassed  = false;

    while (attempt <= MAX_STAGE_RETRIES) {
      // Call evaluateStage (or injected override).
      let evalResult;
      try {
        evalResult = evaluateFn({
          pngPath,
          stageName: stageId,
          captionText,
          tokens: {},
          _fakeClaudeBin,
          stageId,       // extra context for injected overrides in tests
        });
      } catch (err) {
        evalResult = {
          scores: { legibility:0, overlap:0, hierarchy:0, brand:0, composition:0, onbrand:0, cinematic:0, overall:0 },
          issues: [{ severity:'critical', what: String(err.message), where:'evaluation', fix_suggestion:'Check PNG path and model' }],
        };
      }

      callCount++;

      // Determine action label for history.
      const action = attempt === 0 ? 'evaluate' : 'retry';

      // R003.AC5: append to qa-history.jsonl.
      appendQaHistory(deckPath, {
        ts:      new Date().toISOString(),
        stageId,
        attempt,
        scores:  evalResult.scores,
        issues:  evalResult.issues,
        action,
      });

      const overall = evalResult.scores && typeof evalResult.scores.overall === 'number'
        ? evalResult.scores.overall
        : 0;

      if (overall >= THRESHOLD) {
        stagePassed = true;
        break;
      }

      // Stage failed — try a retry if budget allows.
      if (stageRetries < MAX_STAGE_RETRIES && deckBudget > 0) {
        stageRetries++;
        retryCount++;
        deckBudget--;
        attempt++;

        // R003.AC2: compose revision for ONLY this stage.
        const revisionComposeFn = composeFn
          ? (args) => composeFn(args)
          : (args) => composeStageRevision({ ...args, _fakeClaudeBin });

        revisionComposeFn({
          stageId,
          issues:            evalResult.issues,
          currentStageEntry: stage,
          deckPath,
        });
      } else {
        // Budget exhausted for this stage.
        break;
      }
    }

    if (!stagePassed) {
      failingStages.push({ stageId, stage });
    }
  }

  // R003.AC4: if any stages still failing after budget, prompt user.
  let userAction = null;
  if (failingStages.length > 0) {
    const ids = failingStages.map((s) => s.stageId).join(', ');
    print(`\nQA budget exhausted. The following stages still have issues: ${ids}`);
    print('Type `accept` to accept remaining issues, `edit` to open the deck in your editor, or `abandon` to discard this deck.');

    const answer = await promptUser('Your choice (accept/edit/abandon): ', _stdin);
    userAction = answer.toLowerCase().trim();
    if (!['accept', 'edit', 'abandon'].includes(userAction)) {
      userAction = 'accept'; // Default to accept if unrecognized.
    }
  }

  // R004.AC2: print actual cost summary.
  const actualCost = callCount * costPerCall;
  const actualStr  = actualCost.toFixed(2);
  print(
    `QA complete. ${callCount} call${callCount !== 1 ? 's' : ''}, ${retryCount} retr${retryCount !== 1 ? 'ies' : 'y'}, ~$${actualStr} actual (est: ~$${estStr})`
  );

  return {
    callCount,
    retryCount,
    estimatedCost,
    actualCost,
    userAction,
    failingStages: failingStages.map((s) => s.stageId),
  };
}

// ---------------------------------------------------------------------------
// T009: loadStagesFromDeck — read stages from sidecar JSON or fallback
// ---------------------------------------------------------------------------

/**
 * Load stage configs from <deck>/src/deck/stages.json sidecar.
 * Falls back to an empty array if the file is not found.
 *
 * @param {string}  deckPath  - Absolute path to deck directory.
 * @param {boolean} mainOnly  - If true, exclude stages with `backup: true`.
 * @returns {Array} Array of stage config objects.
 */
function loadStagesFromDeck(deckPath, mainOnly) {
  const sidecarPath = path.join(deckPath, 'src', 'deck', 'stages.json');
  let raw = null;
  try {
    raw = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
  } catch {
    return [];
  }

  // Sidecar stores { source: '...' } or an array of stage objects directly.
  let stagesArray = Array.isArray(raw) ? raw : (raw.stages || []);
  if (mainOnly) {
    stagesArray = stagesArray.filter((s) => !s.backup);
  }
  return stagesArray;
}

module.exports = { evaluateStage, extractJson, validateQaResponse, runQALoop, composeStageRevision };
