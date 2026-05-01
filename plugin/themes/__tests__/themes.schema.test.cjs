// T004 schema test — validates every theme JSON in `themes/` conforms to the
// shared token contract. Uses Node's built-in test runner so it has no deps.
//
// Run: node --test plugin/themes/__tests__/themes.schema.test.cjs

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const THEMES_DIR = path.resolve(__dirname, '..');
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const REQUIRED_TOP_KEYS = [
  'name', 'displayName', 'description',
  'background', 'foreground', 'mutedForeground', 'border',
  'surfaceBase', 'surfaceSubtle', 'surfaceRaised',
  'success', 'info', 'warning', 'destructive',
  'fontDisplay', 'fontBody', 'fontMono',
  'radius', 'shadow', 'connectorPalette', 'accent'
];

const REQUIRED_HEX_KEYS = [
  'background', 'foreground', 'mutedForeground', 'border',
  'surfaceBase', 'surfaceSubtle', 'surfaceRaised',
  'success', 'info', 'warning', 'destructive'
];

const REQUIRED_RADIUS_KEYS = ['sm', 'md', 'lg', 'xl'];
const REQUIRED_SHADOW_KEYS = ['sm', 'md', 'lg'];
const REQUIRED_CONNECTORS = [
  'drive', 'slack', 'github', 'notion', 'onedrive',
  'salesforce', 'jira', 'confluence', 'teams', 'linear'
];

const EXPECTED_THEMES = [
  'stacklink-dark',
  'bunq-mint-light',
  'linear-light',
  'minimal-mono',
  'playful-poster'
];

function listThemeFiles() {
  return fs.readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(THEMES_DIR, f));
}

test('all 5 expected themes are present', () => {
  const files = listThemeFiles().map((p) => path.basename(p, '.json'));
  for (const expected of EXPECTED_THEMES) {
    assert.ok(files.includes(expected), `missing theme: ${expected}.json`);
  }
});

for (const file of listThemeFiles()) {
  const themeName = path.basename(file, '.json');

  test(`${themeName}: has all required top-level keys`, () => {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const key of REQUIRED_TOP_KEYS) {
      assert.ok(key in theme, `${themeName} missing key: ${key}`);
    }
    assert.equal(theme.name, themeName, `${themeName}: name field must match filename`);
  });

  test(`${themeName}: all color tokens are valid hex`, () => {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const key of REQUIRED_HEX_KEYS) {
      assert.match(theme[key], HEX_RE, `${themeName}.${key} = ${theme[key]} is not valid hex`);
    }
  });

  test(`${themeName}: radius scale complete`, () => {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const key of REQUIRED_RADIUS_KEYS) {
      assert.ok(key in theme.radius, `${themeName}.radius missing: ${key}`);
      assert.equal(typeof theme.radius[key], 'string');
    }
  });

  test(`${themeName}: shadow scale complete`, () => {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const key of REQUIRED_SHADOW_KEYS) {
      assert.ok(key in theme.shadow, `${themeName}.shadow missing: ${key}`);
      assert.equal(typeof theme.shadow[key], 'string');
    }
  });

  test(`${themeName}: connectorPalette has all 10 connectors with valid hex`, () => {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const connector of REQUIRED_CONNECTORS) {
      assert.ok(connector in theme.connectorPalette, `${themeName}.connectorPalette missing: ${connector}`);
      assert.match(theme.connectorPalette[connector], HEX_RE,
        `${themeName}.connectorPalette.${connector} = ${theme.connectorPalette[connector]} not valid hex`);
    }
  });

  test(`${themeName}: accent is non-empty array of valid hex`, () => {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(Array.isArray(theme.accent), `${themeName}.accent must be an array`);
    assert.ok(theme.accent.length > 0, `${themeName}.accent must be non-empty`);
    for (const color of theme.accent) {
      assert.match(color, HEX_RE, `${themeName}.accent: ${color} not valid hex`);
    }
  });
}
