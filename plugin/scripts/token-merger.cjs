// T014: token-merger.cjs — layered token resolution.
//
// Merges tokens across four layers (later overrides earlier):
//   1. theme JSON              (themes/<themeName>.json)
//   2. --tokens path           (JSON or markdown with hex+keyword pairs)
//   3. --reference image       (palette-extractor.cjs)
//   4. --prompt                (raw text, stored under _prompt for T018)
//
// Returns { tokens, sources, missingFields }.
// `sources` maps each output field to the layer that supplied it.
// `missingFields` lists required theme keys still absent after all layers.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { extractPalette } = require('./palette-extractor.cjs');

const PLUGIN_DIR = path.resolve(__dirname, '..');

// Required theme key set (mirrors stacklink-dark.json + tokens.ts contract).
const REQUIRED_FIELDS = [
  'background', 'foreground', 'mutedForeground', 'border',
  'surfaceBase', 'surfaceSubtle', 'surfaceRaised',
  'success', 'info', 'warning', 'destructive',
  'fontDisplay', 'fontBody', 'fontMono'
];

function readThemeJson(themeName) {
  const file = path.join(PLUGIN_DIR, 'themes', `${themeName}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Tiny markdown parser: finds hex colors near keyword labels under
// `# colors` / `# fonts` headings. Pragmatic — not a full parser.
function parseTokensFile(tokensPath) {
  if (!fs.existsSync(tokensPath)) {
    throw new Error(`token-merger: --tokens file not found: ${tokensPath}`);
  }
  const raw = fs.readFileSync(tokensPath, 'utf8');
  // Try JSON first.
  try { return JSON.parse(raw); } catch (_) { /* fall through to md */ }
  // Markdown: scan each line for `keyword ... #HEX` patterns.
  const out = {};
  const hexRe = /([a-zA-Z][a-zA-Z]*)\s*[:=]?\s*(#[0-9A-Fa-f]{3,8})/g;
  let m;
  while ((m = hexRe.exec(raw)) !== null) {
    out[m[1]] = m[2].toUpperCase();
  }
  return out;
}

function mergeTokens({ themeName = 'stacklink-dark', tokensPath, referenceImage, prompt } = {}) {
  const tokens = {};
  const sources = {};

  // Layer 1: theme JSON.
  const theme = readThemeJson(themeName);
  if (theme) {
    for (const k of Object.keys(theme)) {
      if (k === 'name' || k === 'displayName' || k === 'description') continue;
      tokens[k] = theme[k];
      sources[k] = 'theme';
    }
  }

  // Layer 2: --tokens path.
  if (tokensPath) {
    const overrides = parseTokensFile(tokensPath);
    for (const k of Object.keys(overrides)) {
      tokens[k] = overrides[k];
      sources[k] = 'tokens';
    }
  }

  // Layer 3: --reference image (palette extractor).
  if (referenceImage) {
    const palette = extractPalette(referenceImage);
    for (const k of Object.keys(palette)) {
      tokens[k] = palette[k];
      sources[k] = 'reference';
    }
  }

  // Layer 4: --prompt (raw stash for T018 to clarify).
  if (prompt) {
    tokens._prompt = prompt;
    sources._prompt = 'prompt';
  }

  // Compute missingFields against the required set.
  const missingFields = REQUIRED_FIELDS.filter((f) => !(f in tokens));

  return { tokens, sources, missingFields };
}

module.exports = { mergeTokens, REQUIRED_FIELDS };
