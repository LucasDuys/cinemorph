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

module.exports = { evaluateStage, extractJson, validateQaResponse };
