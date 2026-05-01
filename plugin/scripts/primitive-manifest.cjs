// T015: primitive-manifest.cjs — walks primitives dir, extracts JSDoc, returns manifest.
//
// Usage:
//   const { buildManifest } = require('./primitive-manifest.cjs');
//   const manifest = buildManifest();
//   // => [{ name, jsdoc, supportedShapes }, ...]
//
// Excludes: index.ts, __tests__/ directory, connector subfiles (files inside connectors/).
// Looks for primitives relative to this script: ../primitives/
// Falls back to ~/.claude/plugins/morph-deck/primitives/ if relative path not found.

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Default primitives directory: relative to this script.
const RELATIVE_PRIMITIVES = path.resolve(__dirname, '..', 'primitives');
const PLUGIN_PRIMITIVES = path.join(
  os.homedir(),
  '.claude', 'plugins', 'morph-deck', 'primitives'
);

/**
 * Resolve the primitives directory.
 * Prefer the relative path (dev install); fall back to plugin cache path.
 * @param {string} [override] - Optional explicit path for testing.
 * @returns {string} Resolved directory path.
 */
function resolvePrimitivesDir(override) {
  if (override) return override;
  if (fs.existsSync(RELATIVE_PRIMITIVES)) return RELATIVE_PRIMITIVES;
  if (fs.existsSync(PLUGIN_PRIMITIVES)) return PLUGIN_PRIMITIVES;
  return RELATIVE_PRIMITIVES; // let caller deal with missing dir
}

/**
 * Extract the leading JSDoc block from a source file.
 * Matches the first /** ... *\/ block at the top of the file (may be preceded only by whitespace).
 * @param {string} source - File contents as string.
 * @returns {string} JSDoc text with leading/trailing whitespace trimmed, or empty string.
 */
function extractJsdoc(source) {
  const match = source.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (!match) return '';
  // Clean up leading ' * ' from each line.
  return match[1]
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, '').trimEnd())
    .join('\n')
    .trim();
}

/**
 * Parse the "Supported morph shapes:" line from a JSDoc block.
 * Expects a line like: "Supported morph shapes: hero, orbit, cluster"
 * @param {string} jsdoc - Cleaned JSDoc text.
 * @returns {string[]} Array of shape name strings (trimmed, lowercased).
 */
function parseSupportedShapes(jsdoc) {
  const line = jsdoc.split('\n').find(l => /Supported morph shapes:/i.test(l));
  if (!line) return [];
  const after = line.replace(/.*Supported morph shapes:\s*/i, '');
  return after
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Derive the primitive name from a file path.
 * Strips the extension and lowercases the first char.
 * ConnectorChip.tsx -> connectorChip, Wordmark.tsx -> wordmark
 * @param {string} filePath - Absolute file path.
 * @returns {string}
 */
function deriveName(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base.charAt(0).toLowerCase() + base.slice(1);
}

/**
 * Build the primitive manifest by walking the primitives directory.
 *
 * @param {object} [options]
 * @param {string} [options.primitivesDir] - Override the primitives directory (for testing).
 * @returns {Array<{ name: string, jsdoc: string, supportedShapes: string[] }>}
 */
function buildManifest(options = {}) {
  const dir = resolvePrimitivesDir(options.primitivesDir);

  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    // Skip __tests__ directory.
    if (entry.isDirectory() && entry.name === '__tests__') continue;
    // Skip connectors/ subdirectory — only top-level primitives.
    if (entry.isDirectory() && entry.name === 'connectors') continue;
    // Only process .tsx and .ts files at the top level.
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (ext !== '.tsx' && ext !== '.ts') continue;
    // Skip index.ts.
    if (entry.name === 'index.ts') continue;

    const filePath = path.join(dir, entry.name);
    const source = fs.readFileSync(filePath, 'utf8');
    const jsdoc = extractJsdoc(source);
    const supportedShapes = parseSupportedShapes(jsdoc);
    const name = deriveName(filePath);

    result.push({ name, jsdoc, supportedShapes });
  }

  // Sort alphabetically for deterministic output.
  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

module.exports = { buildManifest, extractJsdoc, parseSupportedShapes, deriveName, resolvePrimitivesDir };
