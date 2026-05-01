// T014 acceptance test: token-merger layer order + source attribution.
// Run: node plugin/__tests__/token-merger.test.cjs

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { mergeTokens, REQUIRED_FIELDS } = require('../scripts/token-merger.cjs');

function tmpFile(name, content) {
  const f = path.join(os.tmpdir(), `t014-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
  fs.writeFileSync(f, content);
  return f;
}

test('theme-only: all fields sourced from theme JSON', () => {
  const r = mergeTokens({ themeName: 'stacklink-dark' });
  assert.equal(r.tokens.background, '#09090F');
  assert.equal(r.sources.background, 'theme');
  assert.deepEqual(r.missingFields, []);
});

test('tokens layer overrides theme', () => {
  const tokensFile = tmpFile('tokens.json', JSON.stringify({ background: '#FF0000' }));
  const r = mergeTokens({ themeName: 'stacklink-dark', tokensPath: tokensFile });
  assert.equal(r.tokens.background, '#FF0000');
  assert.equal(r.sources.background, 'tokens');
  assert.equal(r.sources.foreground, 'theme'); // not overridden
});

test('reference layer overrides theme + tokens for palette roles', () => {
  // Need a real (deterministic) image file — palette-extractor reads bytes.
  const imgFile = tmpFile('img.bin', Buffer.from([1, 2, 3, 4, 5]));
  const r = mergeTokens({ themeName: 'stacklink-dark', referenceImage: imgFile });
  assert.equal(r.sources.background, 'reference');
  assert.match(r.tokens.background, /^#[0-9A-F]{6}$/);
});

test('prompt stored under _prompt with prompt source', () => {
  const r = mergeTokens({ themeName: 'stacklink-dark', prompt: 'modern dark deck' });
  assert.equal(r.tokens._prompt, 'modern dark deck');
  assert.equal(r.sources._prompt, 'prompt');
});

test('missingFields populated when theme not found and no overrides', () => {
  const r = mergeTokens({ themeName: '__nonexistent__' });
  assert.ok(r.missingFields.length === REQUIRED_FIELDS.length);
  assert.ok(r.missingFields.includes('background'));
});
