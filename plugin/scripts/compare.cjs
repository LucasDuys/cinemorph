// T010: compare.cjs — compare-against-reference command.
//
// Renders two decks to PNGs, matches stages by role (eyebrow + token overlap),
// calls vision-LLM for per-axis verdicts, writes comparison.md, and optionally
// auto-improves the new deck via the composer.
//
// Exports:
//   runCompare({ newDeckPath, refNameOrPath, autoImprove, _fakeClient, _fakeRenderer })
//   compareStages({ newPng, refPng, stageName, tokens, _fakeClient })
//   matchStagesByRole(newStages, refStages)
//   runCli(args)  -- thin CLI wrapper for router.cjs

'use strict';

const cp   = require('node:child_process');
const fs   = require('node:fs');
const path = require('node:path');

const { resolveReference } = require('./reference-registry.cjs');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMPARE_MODEL = process.env.COMPARE_MODEL || 'claude-sonnet-4-6';
const WALL_TIME_MS  = 120_000; // 2 minutes per vision call
const MAX_AUTO_IMPROVE_ROUNDS = 3;

// 7 rubric axes (matches qa-runner.cjs vocabulary).
const AXES = ['legibility', 'overlap', 'hierarchy', 'brand', 'composition', 'onbrand', 'cinematic'];

// Verdict labels.
const VERDICT_NEW_BETTER  = 'VERDICT: NEW IS BETTER';
const VERDICT_EQUIVALENT  = 'VERDICT: EQUIVALENT';
const VERDICT_REF_BETTER  = 'VERDICT: REFERENCE IS BETTER';

// ---------------------------------------------------------------------------
// Token-overlap stage matching (AC2)
// ---------------------------------------------------------------------------

/**
 * Tokenize a string: lowercase, split on whitespace + punctuation.
 * @param {string} s
 * @returns {string[]}
 */
function tokenize(s) {
  if (!s || typeof s !== 'string') return [];
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Jaccard token-overlap between two token arrays.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number} 0..1
 */
function jaccard(a, b) {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Build the role fingerprint for a stage: eyebrow + headline first 3 words.
 * Frame names are excluded because they embed positional tokens (slide-1, ref-slide-2)
 * that create false overlaps between unrelated stages.
 *
 * @param {object} stage - Stage descriptor with optional eyebrow, headline fields.
 * @returns {string[]} token array
 */
function stageFingerprint(stage) {
  const parts = [];
  if (stage.eyebrow) parts.push(...tokenize(stage.eyebrow));
  if (stage.headline) {
    const headWords = tokenize(stage.headline).slice(0, 3);
    parts.push(...headWords);
  }
  return parts;
}

/**
 * Match new-deck stages to reference-deck stages by role (eyebrow + intent token-overlap).
 * Returns pairs sorted by descending score. Unmatched stages are omitted.
 *
 * @param {object[]} newStages - Array of stage descriptors from new deck.
 * @param {object[]} refStages - Array of stage descriptors from reference deck.
 * @returns {{ newStage: object, refStage: object, score: number }[]}
 */
function matchStagesByRole(newStages, refStages) {
  const pairs = [];
  const usedRef = new Set();

  for (const ns of newStages) {
    const nfp = stageFingerprint(ns);
    let bestScore = -1;
    let bestRef   = null;

    for (let ri = 0; ri < refStages.length; ri++) {
      if (usedRef.has(ri)) continue;
      const rfp = stageFingerprint(refStages[ri]);
      const score = jaccard(nfp, rfp);
      if (score > bestScore) {
        bestScore = score;
        bestRef   = ri;
      }
    }

    if (bestRef !== null) {
      usedRef.add(bestRef);
      pairs.push({ newStage: ns, refStage: refStages[bestRef], score: bestScore });
    }
  }

  // Sort by descending match quality for reporting.
  pairs.sort((a, b) => b.score - a.score);
  return pairs;
}

// ---------------------------------------------------------------------------
// JSON extraction helper (same pattern as qa-runner.cjs)
// ---------------------------------------------------------------------------

/**
 * Extract the first JSON object from raw LLM output.
 * @param {string} raw
 * @returns {string}
 * @throws {Error}
 */
function extractJson(raw) {
  let cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `compare: no JSON object found in LLM output. ` +
      `Raw (first 400 chars): ${raw.slice(0, 400)}`
    );
  }
  return cleaned.slice(start, end + 1);
}

// ---------------------------------------------------------------------------
// Vision-LLM side-by-side evaluation (AC3)
// ---------------------------------------------------------------------------

/**
 * Build the vision prompt content array for a side-by-side stage comparison.
 * Sends both PNGs as image blocks + a rubric instruction.
 *
 * @param {string} newPng  - Absolute path to new-deck stage PNG.
 * @param {string} refPng  - Absolute path to reference-deck stage PNG.
 * @param {string} stageName - Human-readable stage label.
 * @param {object} tokens  - Design tokens (for context).
 * @returns {Array} Anthropic content array.
 */
function buildComparePrompt(newPng, refPng, stageName, tokens) {
  const readB64 = (p) => {
    if (!fs.existsSync(p)) {
      throw new Error(`compare: PNG not found: ${p}`);
    }
    return fs.readFileSync(p).toString('base64');
  };

  const newB64 = readB64(newPng);
  const refB64 = readB64(refPng);

  const tokenLines = tokens
    ? Object.entries(tokens).map(([k, v]) => `  ${k}: ${v}`).join('\n')
    : '';

  const instruction = `You are comparing two slides for the stage "${stageName}".
The FIRST image is the NEW deck. The SECOND image is the REFERENCE deck.

${tokenLines ? `Design tokens:\n${tokenLines}\n\n` : ''}Evaluate each of the 7 rubric axes and decide which slide is better, or if they are equivalent.

Rubric axes: legibility, overlap, hierarchy, brand, composition, onbrand, cinematic.

Respond with ONLY a JSON object in exactly this shape:
{
  "axes": [
    { "axis": "legibility", "verdict": "new-better" | "equivalent" | "ref-better", "reason": "<one sentence>" },
    { "axis": "overlap",    "verdict": "new-better" | "equivalent" | "ref-better", "reason": "<one sentence>" },
    { "axis": "hierarchy",  "verdict": "new-better" | "equivalent" | "ref-better", "reason": "<one sentence>" },
    { "axis": "brand",      "verdict": "new-better" | "equivalent" | "ref-better", "reason": "<one sentence>" },
    { "axis": "composition","verdict": "new-better" | "equivalent" | "ref-better", "reason": "<one sentence>" },
    { "axis": "onbrand",    "verdict": "new-better" | "equivalent" | "ref-better", "reason": "<one sentence>" },
    { "axis": "cinematic",  "verdict": "new-better" | "equivalent" | "ref-better", "reason": "<one sentence>" }
  ]
}

No prose before or after. No markdown fences. Only the JSON object.`;

  return [
    {
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: newB64 },
    },
    {
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: refB64 },
    },
    {
      type: 'text',
      text: instruction,
    },
  ];
}

/**
 * Evaluate one pair of stage PNGs on all 7 rubric axes.
 *
 * @param {object} params
 * @param {string} params.newPng      - Absolute path to new-deck stage PNG.
 * @param {string} params.refPng      - Absolute path to reference-deck stage PNG.
 * @param {string} params.stageName   - Human-readable stage label.
 * @param {object} params.tokens      - Design tokens.
 * @param {string} [params._fakeClient] - For testing: path to a fake CLI script (.js).
 *
 * @returns {{ axis: string, verdict: 'new-better'|'equivalent'|'ref-better', reason: string }[]}
 */
function compareStages({ newPng, refPng, stageName, tokens, _fakeClient }) {
  const promptContent = buildComparePrompt(newPng, refPng, stageName, tokens);
  const promptJson    = JSON.stringify(promptContent);

  const systemPrompt = [
    'You are a professional presentation design reviewer.',
    'Compare two slides and return only the requested JSON object.',
  ].join(' ');

  const fakeRaw  = _fakeClient || process.env.MORPH_DECK_FAKE_CLAUDE || null;
  const claudeBin = fakeRaw || 'claude';

  const cliArgs = [
    '-p', promptJson,
    '--system-prompt', systemPrompt,
    '--output-format', 'text',
    '--model', COMPARE_MODEL,
  ];

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
    throw new Error(`compare: failed to spawn claude CLI: ${err.message}`);
  }

  if (spawnResult.status === null && spawnResult.signal === 'SIGTERM') {
    throw new Error(`compare: wall-time budget exceeded for stage "${stageName}"`);
  }

  if (spawnResult.status !== 0) {
    const stderr = spawnResult.stderr || '';
    throw new Error(
      `compare: claude CLI exited ${spawnResult.status} for stage "${stageName}". ` +
      `stderr: ${stderr.slice(0, 500)}`
    );
  }

  const rawOutput = spawnResult.stdout || '';

  let parsed;
  try {
    const jsonStr = extractJson(rawOutput);
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `compare: malformed JSON in response for stage "${stageName}": ${err.message}`
    );
  }

  if (!parsed.axes || !Array.isArray(parsed.axes)) {
    throw new Error(`compare: response missing "axes" array for stage "${stageName}"`);
  }

  const valid = new Set(['new-better', 'equivalent', 'ref-better']);
  for (const entry of parsed.axes) {
    if (!valid.has(entry.verdict)) {
      throw new Error(
        `compare: invalid verdict "${entry.verdict}" for axis "${entry.axis}" in stage "${stageName}"`
      );
    }
  }

  return parsed.axes;
}

// ---------------------------------------------------------------------------
// Tally helpers (AC4)
// ---------------------------------------------------------------------------

/**
 * Compute per-stage verdict from per-axis verdicts (majority of 7 axes).
 * @param {{ verdict: string }[]} axisResults
 * @returns {'new-better'|'equivalent'|'ref-better'}
 */
function tallyStageVerdict(axisResults) {
  let newCount = 0;
  let refCount = 0;
  for (const { verdict } of axisResults) {
    if (verdict === 'new-better')  newCount++;
    if (verdict === 'ref-better')  refCount++;
  }
  if (newCount > refCount) return 'new-better';
  if (refCount > newCount) return 'ref-better';
  return 'equivalent';
}

/**
 * Compute global verdict from per-stage verdicts (majority of stage count).
 * @param {string[]} stageVerdicts
 * @returns {'new-better'|'equivalent'|'ref-better'}
 */
function tallyGlobalVerdict(stageVerdicts) {
  let newCount = 0;
  let refCount = 0;
  for (const v of stageVerdicts) {
    if (v === 'new-better')  newCount++;
    if (v === 'ref-better')  refCount++;
  }
  if (newCount > refCount) return 'new-better';
  if (refCount > newCount) return 'ref-better';
  return 'equivalent';
}

/**
 * Convert internal verdict to VERDICT line string.
 * @param {'new-better'|'equivalent'|'ref-better'} verdict
 * @returns {string}
 */
function verdictLine(verdict) {
  if (verdict === 'new-better')  return VERDICT_NEW_BETTER;
  if (verdict === 'ref-better')  return VERDICT_REF_BETTER;
  return VERDICT_EQUIVALENT;
}

// ---------------------------------------------------------------------------
// Markdown report builder (AC3)
// ---------------------------------------------------------------------------

/**
 * Build a comparison.md report.
 *
 * @param {{ newStage, refStage, axisResults, stageVerdict }[]} stageReports
 * @param {'new-better'|'equivalent'|'ref-better'} globalVerdict
 * @returns {string}
 */
function buildReport(stageReports, globalVerdict) {
  const lines = ['# Deck Comparison', ''];

  for (let i = 0; i < stageReports.length; i++) {
    const { newStage, axisResults, stageVerdict } = stageReports[i];
    const eyebrow = newStage.eyebrow || newStage.frame || newStage.frame_name || `Stage ${i + 1}`;
    lines.push(`## Stage ${i + 1}: ${eyebrow}`, '');

    for (const { axis, verdict, reason } of axisResults) {
      const label = verdict === 'new-better' ? 'NEW BETTER'
        : verdict === 'ref-better' ? 'REF BETTER'
        : 'EQUIVALENT';
      const reasonStr = reason ? ` (${reason})` : '';
      lines.push(`- ${capitalize(axis)}: ${label}${reasonStr}`);
    }

    const newCount = axisResults.filter(a => a.verdict === 'new-better').length;
    const refCount = axisResults.filter(a => a.verdict === 'ref-better').length;
    const stageLabel = stageVerdict === 'new-better' ? 'NEW BETTER'
      : stageVerdict === 'ref-better' ? 'REF BETTER'
      : 'EQUIVALENT';
    lines.push(`- Stage verdict: ${stageLabel} (${newCount} of ${axisResults.length} axes)`);
    lines.push('');
  }

  lines.push(verdictLine(globalVerdict));
  return lines.join('\n');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Rendering helper (AC1)
// ---------------------------------------------------------------------------

/**
 * Render a deck to PNGs by spawning render-stages.mjs.
 * Returns array of absolute PNG paths in stage order.
 *
 * @param {string} deckPath  - Absolute path to deck directory.
 * @param {Function|null} _fakeRenderer - For tests: sync function returning { pngs: string[] }.
 * @returns {{ ok: boolean, pngs: string[], error?: string }}
 */
function renderDeck(deckPath, _fakeRenderer) {
  if (_fakeRenderer) {
    return _fakeRenderer(deckPath);
  }

  const renderScript = path.resolve(__dirname, 'render-stages.mjs');
  const result = cp.spawnSync(process.execPath, ['--input-type=module', renderScript, deckPath], {
    encoding: 'utf8',
    timeout: 5 * 60 * 1000, // 5 min
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    return {
      ok: false,
      pngs: [],
      error: `render-stages exited ${result.status}: ${(result.stderr || '').slice(0, 500)}`,
    };
  }

  // Discover PNGs in dist/qa/ directory.
  const qaDir = path.join(deckPath, 'dist', 'qa');
  if (!fs.existsSync(qaDir)) {
    return { ok: false, pngs: [], error: `dist/qa directory not found after render: ${qaDir}` };
  }

  const pngs = fs.readdirSync(qaDir)
    .filter(f => f.endsWith('.png'))
    .sort((a, b) => {
      // sort stage-N.png numerically
      const na = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
      const nb = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
      return na - nb;
    })
    .map(f => path.join(qaDir, f));

  return { ok: true, pngs };
}

// ---------------------------------------------------------------------------
// Minimal composer invocation for auto-improve (AC5)
// ---------------------------------------------------------------------------

/**
 * Run composer on a deck in single-stage diff mode.
 * Inlines a minimal call rather than importing T009 (mid-flight).
 *
 * @param {string} deckPath - Absolute path to deck directory.
 * @param {string[]} losingStageEyebrows - Eyebrow text of losing stages.
 * @param {string} [_fakeClaudeBin] - For testing.
 * @returns {{ ok: boolean, error?: string }}
 */
function runComposerIteration(deckPath, losingStageEyebrows, _fakeClaudeBin) {
  const { composeDeck } = require('./composer.cjs');

  // Read existing brief if available, else use a generic improvement prompt.
  let brief = `Improve the presentation deck. Focus on these stages: ${losingStageEyebrows.join(', ')}.`;
  const briefPath = path.join(deckPath, '.morph-deck', 'brief.json');
  if (fs.existsSync(briefPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
      if (saved.brief) {
        brief = `${saved.brief}\n\nFocus on improving these stages: ${losingStageEyebrows.join(', ')}.`;
      }
    } catch (_) {
      // fall back to generic brief
    }
  }

  // Read existing tokens if available.
  let tokens = {};
  const tokensPath = path.join(deckPath, 'src', 'deck', 'tokens.ts');
  if (fs.existsSync(tokensPath)) {
    try {
      const src = fs.readFileSync(tokensPath, 'utf8');
      // Extract key-value pairs from a tokens.ts export.
      const matches = src.matchAll(/(\w+)\s*:\s*['"]([^'"]+)['"]/g);
      for (const m of matches) {
        tokens[m[1]] = m[2];
      }
    } catch (_) {
      // non-fatal
    }
  }

  // Read existing DSL draft if available.
  let dslDraft = '';
  const stagesPath = path.join(deckPath, 'src', 'deck', 'stages.ts');
  if (fs.existsSync(stagesPath)) {
    try {
      dslDraft = fs.readFileSync(stagesPath, 'utf8');
    } catch (_) {
      // non-fatal
    }
  }

  const result = composeDeck({
    brief,
    tokens,
    deckPath,
    dslDraft,
    _fakeClaudeBin,
  });

  if (result.error) {
    return { ok: false, error: `composer iteration failed: ${result.error} — ${result.message}` };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Stage descriptors from PNG filenames + optional deck metadata
// ---------------------------------------------------------------------------

/**
 * Build a minimal stage descriptor array from PNG paths.
 * Tries to read stages.ts for eyebrow/headline metadata; falls back to filename only.
 *
 * @param {string} deckPath
 * @param {string[]} pngs
 * @returns {object[]}
 */
function buildStageDescriptors(deckPath, pngs) {
  let stagesMeta = [];
  const stagesPath = path.join(deckPath, 'src', 'deck', 'stages.ts');
  if (fs.existsSync(stagesPath)) {
    try {
      const src = fs.readFileSync(stagesPath, 'utf8');
      // Simple extraction of eyebrow fields from the stages array.
      const eyebrows = [];
      const eyebrowRe = /eyebrow\s*:\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = eyebrowRe.exec(src)) !== null) {
        eyebrows.push(m[1]);
      }
      stagesMeta = eyebrows;
    } catch (_) {
      // non-fatal
    }
  }

  return pngs.map((pngPath, idx) => {
    const base = path.basename(pngPath, '.png');
    const descriptor = {
      index: idx,
      pngPath,
      frame: base,
    };
    if (stagesMeta[idx]) {
      descriptor.eyebrow = stagesMeta[idx];
    }
    return descriptor;
  });
}

// ---------------------------------------------------------------------------
// Main runCompare orchestrator (AC1-5)
// ---------------------------------------------------------------------------

/**
 * Run a full deck comparison.
 *
 * @param {object} params
 * @param {string}   params.newDeckPath     - Absolute path to the new deck directory.
 * @param {string}   params.refNameOrPath   - Reference deck name (registry) or path.
 * @param {boolean}  [params.autoImprove=false] - If true, iterate on losing stages.
 * @param {string}   [params._fakeClient]   - Fake claude CLI for compareStages.
 * @param {Function} [params._fakeRenderer] - Fake renderer fn(deckPath)->{ok,pngs}.
 * @param {string}   [params._fakeComposerBin] - Fake claude CLI for composer iteration.
 *
 * @returns {{ verdict: string, reportPath: string, rounds: number }}
 */
function runCompare({
  newDeckPath,
  refNameOrPath,
  autoImprove = false,
  _fakeClient,
  _fakeRenderer,
  _fakeComposerBin,
}) {
  // Resolve reference path (AC1 + R006 passthrough).
  const refDeckPath = resolveReference(refNameOrPath);

  let rounds = 0;
  let verdict;
  let reportPath;

  for (let round = 0; round <= MAX_AUTO_IMPROVE_ROUNDS; round++) {
    // Render both decks (AC1).
    const newRender = renderDeck(newDeckPath, _fakeRenderer);
    if (!newRender.ok) {
      throw new Error(`compare: failed to render new deck: ${newRender.error}`);
    }

    const refRender = renderDeck(refDeckPath, _fakeRenderer);
    if (!refRender.ok) {
      throw new Error(`compare: failed to render reference deck: ${refRender.error}`);
    }

    // Build stage descriptors.
    const newStages = buildStageDescriptors(newDeckPath, newRender.pngs);
    const refStages = buildStageDescriptors(refDeckPath, refRender.pngs);

    // Match stages by role (AC2).
    const pairs = matchStagesByRole(newStages, refStages);

    if (pairs.length === 0) {
      throw new Error('compare: no stage pairs could be matched between new and reference decks');
    }

    // Evaluate each pair with vision-LLM (AC3).
    const stageReports = [];
    for (const { newStage, refStage } of pairs) {
      const stageName = newStage.eyebrow || newStage.frame || `stage-${newStage.index}`;
      const axisResults = compareStages({
        newPng:  newStage.pngPath,
        refPng:  refStage.pngPath,
        stageName,
        tokens:  {},
        _fakeClient,
      });
      const sv = tallyStageVerdict(axisResults);
      stageReports.push({ newStage, refStage, axisResults, stageVerdict: sv });
    }

    // Tally global verdict (AC4).
    const stageVerdicts = stageReports.map(r => r.stageVerdict);
    const globalVerdict = tallyGlobalVerdict(stageVerdicts);

    // Write comparison.md (AC3).
    const distDir = path.join(newDeckPath, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    reportPath = path.join(distDir, 'comparison.md');
    const report = buildReport(stageReports, globalVerdict);
    fs.writeFileSync(reportPath, report, 'utf8');

    verdict  = globalVerdict;
    rounds   = round;

    // If NEW IS BETTER or auto-improve not requested, done.
    if (verdict === 'new-better' || !autoImprove) {
      break;
    }

    // AC5: if not NEW IS BETTER and rounds not exhausted, iterate.
    if (round < MAX_AUTO_IMPROVE_ROUNDS) {
      const losingStages = stageReports
        .filter(r => r.stageVerdict !== 'new-better')
        .map(r => r.newStage.eyebrow || r.newStage.frame || `stage-${r.newStage.index}`);

      const composed = runComposerIteration(newDeckPath, losingStages, _fakeComposerBin);
      if (!composed.ok) {
        // Non-fatal: log and stop iterating.
        process.stderr.write(`compare: auto-improve round ${round + 1} composer failed: ${composed.error}\n`);
        break;
      }
      // Loop continues: re-render + re-compare.
    }
  }

  return { verdict: verdictLine(verdict), reportPath, rounds };
}

// ---------------------------------------------------------------------------
// CLI entry point (for router.cjs)
// ---------------------------------------------------------------------------

/**
 * CLI wrapper invoked by router.cjs.
 * Parses positional args + flags and calls runCompare.
 *
 * @param {string[]} args - argv after the 'compare' subcommand token.
 */
function runCli(args) {
  // Parse flags manually (router already stripped the subcommand token).
  let newDeckPath  = null;
  let refNameOrPath = null;
  let autoImprove  = false;

  for (let i = 0; i < args.length; i++) {
    const tok = args[i];
    if (tok === '--deck') {
      newDeckPath = args[i + 1];
      i++;
    } else if (tok === '--against') {
      refNameOrPath = args[i + 1];
      i++;
    } else if (tok === '--auto-improve') {
      autoImprove = true;
    } else if (!tok.startsWith('--') && newDeckPath === null) {
      newDeckPath = tok;
    } else if (!tok.startsWith('--') && refNameOrPath === null) {
      refNameOrPath = tok;
    }
  }

  if (!newDeckPath) {
    process.stderr.write('compare: --deck <path> is required\n');
    return 2;
  }
  if (!refNameOrPath) {
    process.stderr.write('compare: --against <name-or-path> is required\n');
    return 2;
  }

  try {
    const { verdict, reportPath, rounds } = runCompare({
      newDeckPath: path.resolve(newDeckPath),
      refNameOrPath,
      autoImprove,
    });
    process.stdout.write(`${verdict}\n`);
    process.stdout.write(`Report: ${reportPath}\n`);
    if (autoImprove) {
      process.stdout.write(`Auto-improve rounds: ${rounds}\n`);
    }
    return 0;
  } catch (err) {
    process.stderr.write(`compare: ${err.message}\n`);
    return 1;
  }
}

module.exports = {
  runCompare,
  compareStages,
  matchStagesByRole,
  runCli,
  // Exported for tests
  tallyStageVerdict,
  tallyGlobalVerdict,
  verdictLine,
  buildReport,
  VERDICT_NEW_BETTER,
  VERDICT_EQUIVALENT,
  VERDICT_REF_BETTER,
};
