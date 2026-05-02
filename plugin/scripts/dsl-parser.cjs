// T018: dsl-parser.cjs — plain-language stage description to DSL draft.
//
// When a brief contains numbered stage descriptions ("slide 1: ...",
// "stage 2: ..."), this module parses them into a draft STAGES skeleton,
// prints a YAML-ish summary, and asks the user to confirm before React
// composition begins.
//
// Usage:
//   const { parseDsl } = require('./dsl-parser.cjs');
//   const result = await parseDsl({ brief, _promptFn });
//
// Returns:
//   If parseable and confirmed:
//     { dslDraft: string, confirmed: true,  stages: Array }
//   If empty/unparseable or skipped:
//     { dslDraft: '',     confirmed: false, stages: [] }
//
// Dependency injection:
//   _promptFn(question: string) => Promise<string>
//   Pass in a mock in tests; omit to use the default readline-based prompt.

'use strict';

// ---------------------------------------------------------------------------
// Stage extraction
// ---------------------------------------------------------------------------

// Regex to detect numbered stage headings:
//   "slide 1: ..."  "stage 2 - ..."  "step 3. ..."
//   case-insensitive, optional colon / dash / period separator.
const STAGE_HEADING_RE = /(?:slide|stage|step)\s+(\d+)\s*[:\-.]?\s*/i;

/**
 * Split a brief into an array of raw stage blocks.
 * Each block = { number: number, raw: string (the description text) }.
 *
 * @param {string} brief
 * @returns {Array<{ number: number, raw: string }>}
 */
function extractStageBlocks(brief) {
  if (!brief || !brief.trim()) return [];

  const lines = brief.split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const m = STAGE_HEADING_RE.exec(line);
    if (m) {
      if (current !== null) {
        blocks.push(current);
      }
      const afterHeading = line.slice(m.index + m[0].length).trim();
      current = { number: parseInt(m[1], 10), raw: afterHeading };
    } else if (current !== null) {
      // Continuation line belongs to current block.
      const trimmed = line.trim();
      if (trimmed) {
        current.raw = current.raw ? current.raw + ' ' + trimmed : trimmed;
      }
    }
  }

  if (current !== null) {
    blocks.push(current);
  }

  // Require at least 2 blocks to consider the brief as DSL-structured.
  if (blocks.length < 2) return [];

  // Sort by slide number so out-of-order listings are normalized.
  blocks.sort((a, b) => a.number - b.number);

  return blocks;
}

/**
 * Derive a camelCase id string from a slide description.
 * Takes the first 3 significant words.
 *
 * @param {string} raw
 * @param {number} fallback - slide number, used if raw is empty
 * @returns {string}
 */
function deriveId(raw, fallback) {
  if (!raw || !raw.trim()) return 'stage' + fallback;
  const words = raw
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3);
  if (words.length === 0) return 'stage' + fallback;
  return words[0].toLowerCase() + words.slice(1).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
}

/**
 * Derive a headline string from a raw description.
 * Use up to the first 60 characters, truncated at a word boundary.
 *
 * @param {string} raw
 * @returns {string}
 */
function deriveHeadline(raw) {
  if (!raw) return '';
  const clean = raw.trim();
  if (clean.length <= 60) return clean;
  const truncated = clean.slice(0, 60);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 20 ? truncated.slice(0, lastSpace) + '...' : truncated + '...';
}

/**
 * Parse stage blocks into structured stage descriptors.
 *
 * @param {Array<{ number: number, raw: string }>} blocks
 * @returns {Array<{ id: string, name: string, caption: { eyebrow: string, headline: string }, description: string }>}
 */
function buildStageDescriptors(blocks) {
  return blocks.map((block, idx) => {
    const id = deriveId(block.raw, block.number);
    const headline = deriveHeadline(block.raw);
    return {
      id,
      name: 'Stage ' + block.number,
      caption: {
        eyebrow: 'Stage ' + block.number + ' of ' + blocks.length,
        headline,
      },
      description: block.raw,
    };
  });
}

// ---------------------------------------------------------------------------
// YAML-ish summary rendering
// ---------------------------------------------------------------------------

/**
 * Render a compact YAML-ish summary of the parsed stages.
 *
 * @param {Array} stages - output of buildStageDescriptors
 * @returns {string}
 */
function renderYamlSummary(stages) {
  const lines = ['stages:'];
  for (const s of stages) {
    lines.push(`  - id: ${s.id}`);
    lines.push(`    name: ${s.name}`);
    lines.push(`    caption:`);
    lines.push(`      eyebrow: "${s.caption.eyebrow}"`);
    lines.push(`      headline: "${s.caption.headline}"`);
    if (s.description) {
      lines.push(`    description: "${s.description.replace(/"/g, '\\"')}"`);
    }
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// DSL TypeScript draft generation
// ---------------------------------------------------------------------------

/**
 * Emit a TypeScript STAGES skeleton from structured stage descriptors.
 * Placeholder layouts use evenly-spaced columns.
 *
 * @param {Array} stages - output of buildStageDescriptors
 * @returns {string}
 */
function buildDslDraft(stages) {
  const stageBlocks = stages.map((s) => {
    return [
      `  {`,
      `    id: '${s.id}',`,
      `    name: '${s.name}',`,
      `    caption: {`,
      `      eyebrow: '${s.caption.eyebrow}',`,
      `      headline: '${s.caption.headline.replace(/'/g, "\\'")}',`,
      `    },`,
      `    // description: '${s.description.replace(/'/g, "\\'").slice(0, 120)}',`,
      `    frames: {},`,
      `  }`,
    ].join('\n');
  });

  return [
    `// DSL draft generated by dsl-parser — edit before confirming`,
    `import type { StageConfig } from './stages';`,
    ``,
    `export const STAGES: StageConfig[] = [`,
    stageBlocks.join(',\n'),
    `];`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Confirmation + amendment loop
// ---------------------------------------------------------------------------

const CONFIRM_TOKENS = new Set(['yes', 'y', 'proceed', 'looks good', 'ok', 'done', 'confirm']);

/**
 * Parse a `change <stage> <field> <newValue>` amendment command.
 * Returns null if the line is not a change command.
 *
 * @param {string} raw
 * @returns {{ stageRef: string, field: string, newValue: string } | null}
 */
function parseChangeCommand(raw) {
  const trimmed = (raw || '').trim();
  // Allow: change <stageId|stageNumber> <field> <newValue...>
  const m = /^change\s+(\S+)\s+(\S+)\s+(.+)$/i.exec(trimmed);
  if (!m) return null;
  return { stageRef: m[1], field: m[2], newValue: m[3].trim() };
}

/**
 * Apply a change command to the mutable stages array.
 * Mutates in place and returns the (modified) stages array.
 *
 * @param {Array}  stages
 * @param {{ stageRef: string, field: string, newValue: string }} cmd
 */
function applyChange(stages, cmd) {
  // Find stage by id or by 1-based number ("1", "2", ...).
  let target = stages.find(s => s.id === cmd.stageRef);
  if (!target) {
    const n = parseInt(cmd.stageRef, 10);
    if (!isNaN(n) && n >= 1 && n <= stages.length) {
      target = stages[n - 1];
    }
  }
  if (!target) {
    process.stdout.write(`  Stage "${cmd.stageRef}" not found -- no change applied.\n`);
    return;
  }

  // Apply field update.
  switch (cmd.field.toLowerCase()) {
    case 'headline':
      target.caption.headline = cmd.newValue;
      break;
    case 'eyebrow':
      target.caption.eyebrow = cmd.newValue;
      break;
    case 'name':
      target.name = cmd.newValue;
      break;
    case 'id':
      target.id = cmd.newValue;
      break;
    case 'description':
      target.description = cmd.newValue;
      break;
    default:
      process.stdout.write(`  Unknown field "${cmd.field}" -- supported: headline, eyebrow, name, id, description\n`);
  }
}

/**
 * Build the default readline-based prompt function (shared with clarify.cjs
 * but intentionally not extracted — avoid coupling between modules).
 *
 * @returns {(question: string) => Promise<string>}
 */
function makeReadlinePrompt() {
  const readline = require('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return (question) => new Promise((resolve) => {
    rl.question(question + ' ', (answer) => {
      resolve(answer);
    });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a brief for numbered stage descriptions and, if found, present the
 * parsed draft to the user for confirmation before composition.
 *
 * @param {object}   params
 * @param {string}   params.brief       - Raw brief text.
 * @param {Function} [params._promptFn] - Injected prompt function for tests.
 *                                        Signature: (question: string) => Promise<string>
 * @returns {Promise<{ dslDraft: string, confirmed: boolean, stages: Array }>}
 */
async function parseDsl({ brief, _promptFn } = {}) {
  const blocks = extractStageBlocks(brief);

  // Empty or unparseable brief: no-op.
  if (blocks.length === 0) {
    return { dslDraft: '', confirmed: false, stages: [] };
  }

  const stages = buildStageDescriptors(blocks);
  const summary = renderYamlSummary(stages);

  process.stdout.write('\nDetected stage descriptions. Here is the parsed draft:\n\n');
  process.stdout.write(summary + '\n\n');
  process.stdout.write('Type `yes` / `proceed` / `looks good` to confirm and start composition.\n');
  process.stdout.write('Type `change <stage> <field> <newValue>` to amend a field before confirming.\n');
  process.stdout.write('Type `skip` to ignore this draft and let the composer work free-form.\n\n');

  let promptFn = _promptFn;
  if (!promptFn) {
    promptFn = makeReadlinePrompt();
  }

  // Confirmation + amendment loop.
  while (true) {
    const raw = await promptFn('Your response:');
    const trimmed = (raw || '').trim().toLowerCase();

    if (trimmed === 'skip') {
      return { dslDraft: '', confirmed: false, stages: [] };
    }

    if (CONFIRM_TOKENS.has(trimmed)) {
      const dslDraft = buildDslDraft(stages);
      return { dslDraft, confirmed: true, stages };
    }

    const changeCmd = parseChangeCommand(raw);
    if (changeCmd) {
      applyChange(stages, changeCmd);
      // Re-print updated summary.
      const updated = renderYamlSummary(stages);
      process.stdout.write('\nUpdated draft:\n\n' + updated + '\n\n');
      process.stdout.write('Confirm with `yes` / `proceed`, amend further, or `skip`:\n');
      continue;
    }

    // Unrecognized input — prompt again.
    process.stdout.write('  Type `yes` to confirm, `change <stage> <field> <newValue>` to edit, or `skip`.\n');
  }
}

module.exports = {
  parseDsl,
  extractStageBlocks,
  buildStageDescriptors,
  renderYamlSummary,
  buildDslDraft,
  parseChangeCommand,
  applyChange,
};
