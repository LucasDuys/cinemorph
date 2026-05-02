// T017: iterate.cjs — iterate mode for morph-deck.
//
// Resolves the active deck, reads current deck source, invokes the composer
// in diff mode, applies the patch, reruns the verify loop, and appends to
// history.jsonl.
//
// Usage:
//   const { iterateDeck } = require('./iterate.cjs');
//   await iterateDeck({ change: 'Make the title font larger', deckPath: '/path/to/deck' });
//
// Injectable overrides for testing:
//   _composeFn  - replaces the composer call
//   _verifyFn   - replaces the verify-loop call

'use strict';

const fs   = require('node:fs');
const path = require('node:path');

const { applyPatch } = require('./diff-applier.cjs');

// ---- Active-deck resolution -----------------------------------------------

/**
 * Find the last-touched deck directory under `cwd` by scanning for
 * child directories that contain a `.morph-deck/` subdir, sorted by mtime descending.
 * @param {string} cwd
 * @returns {string|null} Absolute deck root, or null if none found.
 */
function findLastTouchedDeck(cwd) {
  let entries;
  try {
    entries = fs.readdirSync(cwd, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const morphDir = path.join(cwd, entry.name, '.morph-deck');
    try {
      const stat = fs.statSync(morphDir);
      if (stat.isDirectory()) {
        candidates.push({ deckPath: path.join(cwd, entry.name), mtime: stat.mtimeMs });
      }
    } catch {
      // not a deck dir
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0].deckPath;
}

/**
 * Resolve the active deck path.
 * Explicit `deckPath` wins; otherwise auto-detect from `cwd`.
 * @param {string|undefined} deckPath - Explicit override (from --deck flag).
 * @param {string} cwd
 * @returns {string} Resolved absolute deck path.
 * @throws {Error} If no deck can be found.
 */
function resolveActiveDeck(deckPath, cwd) {
  if (deckPath) {
    const abs = path.resolve(cwd, deckPath);
    if (!fs.existsSync(abs)) {
      throw new Error(`iterate: deck not found at explicit path: ${abs}`);
    }
    return abs;
  }

  const auto = findLastTouchedDeck(cwd);
  if (!auto) {
    throw new Error(
      'iterate: no deck found in cwd. ' +
      'Run from a directory containing deck subdirectories, or pass --deck <path>.'
    );
  }
  return auto;
}

// ---- History helpers -------------------------------------------------------

/**
 * Append one JSON line to `<deck>/.morph-deck/history.jsonl`.
 * @param {string} deckPath
 * @param {object} entry
 */
function appendHistory(deckPath, entry) {
  const historyDir  = path.join(deckPath, '.morph-deck');
  const historyFile = path.join(historyDir, 'history.jsonl');
  fs.mkdirSync(historyDir, { recursive: true });
  fs.appendFileSync(historyFile, JSON.stringify(entry) + '\n', 'utf8');
}

// ---- Default compose function (calls T015 composer in diff mode) -----------

async function defaultCompose({ change, deckPath, stagesTs, dataTs, tokensTs }) {
  const { composeDeck } = require('./composer.cjs');
  return composeDeck({
    brief: change,
    deckPath,
    existingFiles: { stagesTs, dataTs, tokensTs },
    mode: 'iterate',
    change,
  });
}

// ---- Default verify function (calls T016 verify-loop) ----------------------

async function defaultVerify({ deckPath }) {
  const { verifyLoop } = require('./verify-loop.cjs');
  // In iterate mode we do not retry composition; just verify once.
  return verifyLoop({ deckPath, retry: async () => {}, maxRetries: 0 });
}

// ---- Main export -----------------------------------------------------------

/**
 * Run one iteration of a morph-deck: apply a change, verify, record history.
 *
 * @param {object}   params
 * @param {string}   params.change        - Plain-language change description.
 * @param {string}   [params.deckPath]    - Explicit deck root (or auto-detected from cwd).
 * @param {string}   [params.cwd]         - Working directory for auto-detection (default: process.cwd()).
 * @param {function} [params._composeFn]  - Override composer (for testing).
 * @param {function} [params._verifyFn]   - Override verify loop (for testing).
 * @returns {Promise<{ ok: boolean, historyEntry: object, previewPath?: string }>}
 */
async function iterateDeck({
  change,
  deckPath: deckPathArg,
  cwd = process.cwd(),
  _composeFn,
  _verifyFn,
}) {
  if (!change || !change.trim()) {
    console.warn('iterate: empty change description — nothing to do.');
    const entry = {
      ts: new Date().toISOString(),
      change: change ?? '',
      files: [],
      status: 'ok',
      warning: 'empty change — no-op',
    };
    return { ok: true, historyEntry: entry };
  }

  // 1. Resolve deck.
  const resolvedDeck = resolveActiveDeck(deckPathArg, cwd);

  // 2. Read current deck source files.
  function readOrEmpty(rel) {
    try {
      return fs.readFileSync(path.join(resolvedDeck, rel), 'utf8');
    } catch {
      return '';
    }
  }
  const stagesTs = readOrEmpty('src/deck/stages.ts');
  const dataTs   = readOrEmpty('src/deck/data.ts');
  const tokensTs = readOrEmpty('src/deck/tokens.ts');

  // 3. Compose (diff mode).
  const composeFn = _composeFn || defaultCompose;
  let composeResult;
  try {
    composeResult = await composeFn({ change, deckPath: resolvedDeck, stagesTs, dataTs, tokensTs });
  } catch (err) {
    const entry = {
      ts: new Date().toISOString(),
      change,
      files: [],
      status: 'failed',
      error: String(err.message || err).slice(0, 500),
    };
    appendHistory(resolvedDeck, entry);
    return { ok: false, historyEntry: entry };
  }

  // 4. Apply patch.
  let appliedFiles = [];
  if (composeResult && composeResult.patch) {
    appliedFiles = applyPatch({ deckPath: resolvedDeck, patch: composeResult.patch });
  } else if (composeResult && composeResult.stagesTs) {
    // Fallback: full-file replacement if composer returns stagesTs/dataTs directly.
    const stagesPath = path.join(resolvedDeck, 'src/deck/stages.ts');
    const dataPath   = path.join(resolvedDeck, 'src/deck/data.ts');
    fs.mkdirSync(path.dirname(stagesPath), { recursive: true });
    if (composeResult.stagesTs) { fs.writeFileSync(stagesPath, composeResult.stagesTs, 'utf8'); appliedFiles.push(stagesPath); }
    if (composeResult.dataTs)   { fs.writeFileSync(dataPath,   composeResult.dataTs,   'utf8'); appliedFiles.push(dataPath); }
  }

  // 5. Verify.
  const verifyFn = _verifyFn || defaultVerify;
  let verifyResult;
  try {
    verifyResult = await verifyFn({ deckPath: resolvedDeck });
  } catch (err) {
    verifyResult = { ok: false, errors: String(err.message || err) };
  }

  // 6. Record history + report.
  const relFiles = appliedFiles.map(f => path.relative(resolvedDeck, f));

  if (verifyResult.ok) {
    const previewPath = verifyResult.screenshot;
    const summary = composeResult?.summary || `Applied ${relFiles.length} file(s): ${relFiles.join(', ')}`;
    console.log(`iterate: ok — ${summary}`);
    if (previewPath) console.log(`preview: ${previewPath}`);

    const entry = {
      ts: new Date().toISOString(),
      change,
      files: relFiles,
      status: 'ok',
    };
    appendHistory(resolvedDeck, entry);
    return { ok: true, historyEntry: entry, previewPath };
  } else {
    const errExcerpt = Array.isArray(verifyResult.errors)
      ? verifyResult.errors.join('\n').slice(0, 500)
      : String(verifyResult.errors ?? '').slice(0, 500);
    const entry = {
      ts: new Date().toISOString(),
      change,
      files: relFiles,
      status: 'failed',
      error: errExcerpt,
    };
    appendHistory(resolvedDeck, entry);
    return { ok: false, historyEntry: entry };
  }
}

module.exports = { iterateDeck, resolveActiveDeck, findLastTouchedDeck, appendHistory };
