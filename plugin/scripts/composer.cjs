// T015: composer.cjs — morph-deck composition harness.
//
// Orchestrates a Claude CLI call to produce stages.ts + data.ts for a deck.
//
// Usage:
//   const { composeDeck } = require('./composer.cjs');
//   const result = await composeDeck({ brief, tokens, deckPath });
//
// Returns: { stagesTs, dataTs, stagesJson, dataJson, model, tokensUsed }
// On budget/time exceeded: { error: 'budget' | 'timeout', message }

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const { buildManifest } = require('./primitive-manifest.cjs');

const AGENT_PROMPT_PATH = path.resolve(__dirname, '..', 'agents', 'morph-composer.md');
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const WALL_TIME_MS = 60_000;
const MAX_OUTPUT_TOKENS = 8000;

/**
 * Strip markdown code fences and extract the first JSON object from a string.
 * Handles responses like:
 *   ```json\n{ ... }\n```
 *   Here is your output:\n{ ... }
 * @param {string} raw - Raw LLM output string.
 * @returns {string} Cleaned string containing just the JSON object.
 * @throws {Error} If no JSON object boundaries are found.
 */
function extractJson(raw) {
  // Remove ```json ... ``` or ``` ... ``` fences.
  let cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
  // Find outermost { ... }.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`composer: no JSON object found in output. Raw (first 500 chars): ${raw.slice(0, 500)}`);
  }
  return cleaned.slice(start, end + 1);
}

/**
 * Build the user message sent to the LLM.
 * @param {object} params
 * @param {string} params.brief
 * @param {object} params.tokens - Resolved design tokens JSON.
 * @param {Array}  params.manifest - From buildManifest().
 * @param {string} [params.clarifications]
 * @param {string} [params.dslDraft]
 * @returns {string}
 */
function buildUserMessage({ brief, tokens, manifest, clarifications, dslDraft }) {
  const parts = [];

  parts.push('## Brief\n' + brief.trim());

  parts.push('## Design Tokens\n```json\n' + JSON.stringify(tokens, null, 2) + '\n```');

  parts.push(
    '## Primitive Manifest\n```json\n' +
    JSON.stringify(manifest, null, 2) +
    '\n```'
  );

  if (clarifications && clarifications.trim()) {
    parts.push('## Clarifications\n' + clarifications.trim());
  }

  if (dslDraft && dslDraft.trim()) {
    parts.push('## DSL Draft (starting point)\n```typescript\n' + dslDraft.trim() + '\n```');
  }

  parts.push(
    '## Instruction\n' +
    'Emit a single JSON object with fields "stagesTs" and "dataTs". ' +
    'No markdown fences around the JSON. No prose. Just the JSON object.'
  );

  return parts.join('\n\n');
}

/**
 * Validate that the generated TypeScript strings look correct.
 * @param {string} stagesTs
 * @param {string} dataTs
 * @throws {Error} If basic sanity checks fail.
 */
function validateOutput(stagesTs, dataTs) {
  if (!stagesTs || stagesTs.trim().length === 0) {
    throw new Error('composer: stagesTs is empty');
  }
  if (!dataTs || dataTs.trim().length === 0) {
    throw new Error('composer: dataTs is empty');
  }
  if (!stagesTs.includes('STAGES')) {
    throw new Error('composer: stagesTs does not contain STAGES export');
  }
  if (!dataTs.includes('export default')) {
    throw new Error('composer: dataTs does not contain "export default"');
  }
}

/**
 * Compose a deck by calling the Claude CLI.
 *
 * @param {object} params
 * @param {string} params.brief - Plain-text description of the deck.
 * @param {object} params.tokens - Resolved design tokens (JSON object).
 * @param {string} params.deckPath - Absolute path to the deck directory (scaffold root).
 * @param {string} [params.clarifications] - Optional follow-up clarification text.
 * @param {string} [params.dslDraft] - Optional partial stages.ts as a starting point.
 * @param {string} [params.model] - Override the Claude model (default: claude-sonnet-4-6).
 * @param {string} [params._fakeClaudeBin] - Internal: path to a stub CLI for testing.
 * @returns {{ stagesTs, dataTs, stagesJson, dataJson, model, tokensUsed } | { error, message }}
 */
function composeDeck({
  brief,
  tokens,
  deckPath,
  clarifications = '',
  dslDraft = '',
  model = DEFAULT_MODEL,
  _fakeClaudeBin,
}) {
  // Read system prompt.
  if (!fs.existsSync(AGENT_PROMPT_PATH)) {
    return { error: 'setup', message: `System prompt not found: ${AGENT_PROMPT_PATH}` };
  }
  const systemPrompt = fs.readFileSync(AGENT_PROMPT_PATH, 'utf8');

  // Build primitive manifest.
  const manifest = buildManifest();

  // Build user message.
  const userMessage = buildUserMessage({ brief, tokens, manifest, clarifications, dslDraft });

  // Resolve Claude binary — allow override via env var (for tests) or param.
  const claudeBin = _fakeClaudeBin || process.env.MORPH_DECK_FAKE_CLAUDE || 'claude';

  // Spawn Claude CLI.
  const args = [
    '-p', userMessage,
    '--system-prompt', systemPrompt,
    '--output-format', 'text',
    '--model', model,
  ];

  let spawnResult;
  try {
    spawnResult = cp.spawnSync(claudeBin, args, {
      input: '',
      timeout: WALL_TIME_MS,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });
  } catch (err) {
    return { error: 'spawn', message: `Failed to spawn claude: ${err.message}` };
  }

  // Handle timeout.
  if (spawnResult.status === null && spawnResult.signal === 'SIGTERM') {
    return { error: 'budget', message: 'Wall-time budget (60s) exceeded; claude process killed' };
  }

  // Handle non-zero exit.
  if (spawnResult.status !== 0) {
    const stderr = spawnResult.stderr || '';
    // Treat token-limit errors as budget errors.
    if (/token|budget|limit/i.test(stderr) || /token|budget|limit/i.test(spawnResult.stdout || '')) {
      return { error: 'budget', message: `Claude returned non-zero exit (${spawnResult.status}); stderr: ${stderr.slice(0, 500)}` };
    }
    return { error: 'cli', message: `Claude exited ${spawnResult.status}. stderr: ${stderr.slice(0, 500)}` };
  }

  const rawOutput = spawnResult.stdout || '';

  // Parse JSON from output.
  let parsed;
  try {
    const jsonStr = extractJson(rawOutput);
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    return { error: 'parse', message: `Failed to parse composer output: ${err.message}` };
  }

  const { stagesTs, dataTs } = parsed;

  // Validate.
  try {
    validateOutput(stagesTs, dataTs);
  } catch (err) {
    return { error: 'validation', message: err.message };
  }

  // Write output files.
  const deckSrcDir = path.join(deckPath, 'src', 'deck');
  fs.mkdirSync(deckSrcDir, { recursive: true });

  const stagesPath = path.join(deckSrcDir, 'stages.ts');
  const dataPath = path.join(deckSrcDir, 'data.ts');
  const stagesJsonPath = path.join(deckSrcDir, 'stages.json');
  const dataJsonPath = path.join(deckSrcDir, 'data.json');

  fs.writeFileSync(stagesPath, stagesTs, 'utf8');
  fs.writeFileSync(dataPath, dataTs, 'utf8');

  // Build JSON sidecars — store raw TS source for downstream pipelines.
  const stagesJson = JSON.stringify({ source: stagesTs }, null, 2);
  const dataJson = JSON.stringify({ source: dataTs }, null, 2);

  fs.writeFileSync(stagesJsonPath, stagesJson, 'utf8');
  fs.writeFileSync(dataJsonPath, dataJson, 'utf8');

  return {
    stagesTs,
    dataTs,
    stagesJson,
    dataJson,
    model,
    tokensUsed: null, // Claude CLI text mode does not surface token counts directly.
  };
}

module.exports = { composeDeck, buildUserMessage, extractJson, validateOutput };
