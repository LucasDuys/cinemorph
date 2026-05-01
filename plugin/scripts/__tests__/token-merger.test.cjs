'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { mergeTokens, REQUIRED_FIELDS } = require('../token-merger.cjs');

function tmpfile(contents, ext = '.json') {
  const p = path.join(os.tmpdir(), `tokens-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  fs.writeFileSync(p, contents);
  return p;
}

test('theme-only: stacklink-dark loads all required fields', () => {
  const { tokens, sources, missingFields } = mergeTokens({ themeName: 'stacklink-dark' });
  assert.equal(tokens.background, '#09090F');
  assert.equal(tokens.foreground, '#FAFAFA');
  assert.equal(sources.background, 'theme');
  for (const f of REQUIRED_FIELDS) {
    assert.ok(f in tokens, `missing required field: ${f}`);
  }
  assert.deepEqual(missingFields, []);
});

test('theme + tokens override: tokens layer wins', () => {
  const tp = tmpfile(JSON.stringify({ background: '#FF00FF', foreground: '#00FF00' }));
  try {
    const { tokens, sources } = mergeTokens({ themeName: 'stacklink-dark', tokensPath: tp });
    assert.equal(tokens.background, '#FF00FF');
    assert.equal(tokens.foreground, '#00FF00');
    assert.equal(sources.background, 'tokens');
    assert.equal(sources.foreground, 'tokens');
    // Untouched fields keep theme attribution
    assert.equal(sources.border, 'theme');
  } finally {
    fs.unlinkSync(tp);
  }
});

test('theme + markdown tokens: hex pairs parsed', () => {
  const md = `# colors\nbackground: #ABCDEF\nforeground: #FEDCBA\n`;
  const tp = tmpfile(md, '.md');
  try {
    const { tokens } = mergeTokens({ themeName: 'stacklink-dark', tokensPath: tp });
    assert.equal(tokens.background, '#ABCDEF');
    assert.equal(tokens.foreground, '#FEDCBA');
  } finally {
    fs.unlinkSync(tp);
  }
});

test('theme + reference image: palette layer wins for the 5 stub roles', () => {
  // Create a tiny fake image file (1×1 transparent PNG signature is fine — extractor stubs via hash)
  const img = tmpfile(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).toString('binary'), '.png');
  try {
    const { tokens, sources } = mergeTokens({ themeName: 'stacklink-dark', referenceImage: img });
    assert.match(tokens.background, /^#[0-9A-F]{6}$/);
    assert.match(tokens.foreground, /^#[0-9A-F]{6}$/);
    assert.equal(sources.background, 'reference');
    assert.equal(sources.foreground, 'reference');
    assert.equal(sources.surfaceRaised, 'reference');
    assert.equal(sources.mutedForeground, 'reference');
    assert.equal(sources.accent, 'reference');
    // border still from theme (palette only sets 5 roles)
    assert.equal(sources.border, 'theme');
  } finally {
    fs.unlinkSync(img);
  }
});

test('prompt is stashed under _prompt for T018 clarification', () => {
  const { tokens, sources } = mergeTokens({ themeName: 'stacklink-dark', prompt: 'dark, restrained, EU-enterprise' });
  assert.equal(tokens._prompt, 'dark, restrained, EU-enterprise');
  assert.equal(sources._prompt, 'prompt');
});

test('missingFields populated when theme not found and no overrides', () => {
  const { tokens, missingFields } = mergeTokens({ themeName: 'nonexistent-theme' });
  assert.deepEqual(tokens, {});
  assert.ok(missingFields.length === REQUIRED_FIELDS.length);
  assert.ok(missingFields.includes('background'));
});
