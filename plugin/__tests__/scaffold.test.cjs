// T001 acceptance test: plugin scaffold sanity.
// Validates plugin.json (R001.AC2), SKILL.md content (R001.AC4 partial,
// R002.AC4 — five subcommands referenced by name), and the empty
// commands/morph-deck.md placeholder that T002 will fill.
//
// Run with: node plugin/__tests__/scaffold.test.cjs
// Exits 0 on success, 1 on any assertion failure.

'use strict';

const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function readFile(rel) {
  return fs.readFileSync(path.join(PLUGIN_ROOT, rel), 'utf8');
}

function fileExists(rel) {
  return fs.existsSync(path.join(PLUGIN_ROOT, rel));
}

// 1. plugin.json exists and parses with name === "morph-deck", version semver.
assert(fileExists('plugin.json'), 'plugin.json should exist at plugin/plugin.json');
let manifest = null;
try {
  manifest = JSON.parse(readFile('plugin.json'));
} catch (err) {
  failures.push('plugin.json should parse as valid JSON: ' + err.message);
}
if (manifest) {
  assert(manifest.name === 'morph-deck', 'plugin.json name should be "morph-deck", got: ' + JSON.stringify(manifest.name));
  assert(typeof manifest.version === 'string' && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version), 'plugin.json version should be semver, got: ' + JSON.stringify(manifest.version));
  assert(typeof manifest.author === 'string' && manifest.author.length > 0, 'plugin.json should declare a non-empty author');
  assert(typeof manifest.description === 'string' && manifest.description.length > 0, 'plugin.json should declare a non-empty description');
  assert(manifest.entryCommand === '/morph-deck', 'plugin.json entryCommand should be "/morph-deck", got: ' + JSON.stringify(manifest.entryCommand));
}

// 2. SKILL.md exists, mentions the five subcommands by name.
assert(fileExists('skills/morph-deck/SKILL.md'), 'SKILL.md should exist at plugin/skills/morph-deck/SKILL.md');
if (fileExists('skills/morph-deck/SKILL.md')) {
  const skill = readFile('skills/morph-deck/SKILL.md');
  for (const sub of ['new', 'iterate', 'render', 'pptx', 'video']) {
    assert(new RegExp('\\b' + sub + '\\b').test(skill), 'SKILL.md should mention subcommand: ' + sub);
  }
  // Sanity: file should not blow past 200 lines (per task instruction).
  const lineCount = skill.split(/\r?\n/).length;
  assert(lineCount <= 200, 'SKILL.md should be <= 200 lines, got: ' + lineCount);
}

// 3. commands/morph-deck.md exists (even if empty body).
assert(fileExists('commands/morph-deck.md'), 'commands/morph-deck.md should exist (T002 will fill the router)');

if (failures.length === 0) {
  console.log('OK: scaffold.test.cjs passed (' + 3 + ' check groups)');
  process.exit(0);
}
console.error('FAIL: scaffold.test.cjs');
for (const f of failures) console.error('  - ' + f);
process.exit(1);
