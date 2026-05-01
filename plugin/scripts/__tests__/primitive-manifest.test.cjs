// T015: primitive-manifest.test.cjs — unit tests for primitive-manifest.cjs
//
// Uses a tmpdir with fake primitive files — does not depend on real primitives dir.

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  buildManifest,
  extractJsdoc,
  parseSupportedShapes,
  deriveName,
} = require('../primitive-manifest.cjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'morph-manifest-test-'));
}

function writeFile(dir, filename, content) {
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
}

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// extractJsdoc
// ---------------------------------------------------------------------------

test('extractJsdoc: extracts clean text from a JSDoc block', () => {
  const source = `/**
 * Wordmark
 *
 * Supported morph shapes: hero, chrome
 * Per-stage props: layout, text, opacity
 */
import { motion } from 'motion/react';
`;
  const jsdoc = extractJsdoc(source);
  assert.ok(jsdoc.includes('Wordmark'), 'should include the first line');
  assert.ok(jsdoc.includes('Supported morph shapes: hero, chrome'));
  // Leading asterisks stripped.
  assert.ok(!jsdoc.includes(' * '), 'leading " * " should be stripped');
});

test('extractJsdoc: returns empty string when no JSDoc present', () => {
  const source = `import React from 'react';\nexport default function Foo() {}\n`;
  assert.equal(extractJsdoc(source), '');
});

test('extractJsdoc: handles file with only whitespace before JSDoc', () => {
  const source = `\n\n/**\n * KPI\n * Supported morph shapes: kpi\n */\nexport default function KPI() {}`;
  const jsdoc = extractJsdoc(source);
  assert.ok(jsdoc.includes('KPI'));
  assert.ok(jsdoc.includes('Supported morph shapes: kpi'));
});

// ---------------------------------------------------------------------------
// parseSupportedShapes
// ---------------------------------------------------------------------------

test('parseSupportedShapes: parses comma-separated shapes', () => {
  const jsdoc = 'Wordmark\n\nSupported morph shapes: hero, orbit, cluster\nOther stuff';
  const shapes = parseSupportedShapes(jsdoc);
  assert.deepEqual(shapes, ['hero', 'orbit', 'cluster']);
});

test('parseSupportedShapes: returns empty array when line absent', () => {
  const jsdoc = 'Some description without shape info.';
  assert.deepEqual(parseSupportedShapes(jsdoc), []);
});

test('parseSupportedShapes: trims whitespace and lowercases', () => {
  const jsdoc = 'Supported morph shapes:  Hero , ORBIT , Cluster ';
  const shapes = parseSupportedShapes(jsdoc);
  assert.deepEqual(shapes, ['hero', 'orbit', 'cluster']);
});

test('parseSupportedShapes: handles single shape', () => {
  const jsdoc = 'Supported morph shapes: kpi';
  assert.deepEqual(parseSupportedShapes(jsdoc), ['kpi']);
});

// ---------------------------------------------------------------------------
// deriveName
// ---------------------------------------------------------------------------

test('deriveName: lowercases first char, preserves rest', () => {
  assert.equal(deriveName('/some/dir/Wordmark.tsx'), 'wordmark');
  assert.equal(deriveName('/some/dir/ConnectorChip.tsx'), 'connectorChip');
  assert.equal(deriveName('/some/dir/KPI.tsx'), 'kPI');
  assert.equal(deriveName('/some/dir/OrbitGroup.tsx'), 'orbitGroup');
});

test('deriveName: strips .ts extension too', () => {
  assert.equal(deriveName('/some/dir/Elements.ts'), 'elements');
});

// ---------------------------------------------------------------------------
// buildManifest — integration with tmpdir
// ---------------------------------------------------------------------------

test('buildManifest: walks primitives dir and extracts JSDoc', () => {
  const dir = makeTmpDir();
  try {
    writeFile(dir, 'Wordmark.tsx', `/**
 * Wordmark
 *
 * Supported morph shapes: hero, chrome
 * Per-stage props: layout
 */
export default function Wordmark() {}
`);
    writeFile(dir, 'KPI.tsx', `/**
 * KPI
 *
 * Supported morph shapes: kpi
 */
export default function KPI() {}
`);

    const manifest = buildManifest({ primitivesDir: dir });
    assert.equal(manifest.length, 2);

    // Should be sorted alphabetically.
    assert.equal(manifest[0].name, 'kPI');
    assert.equal(manifest[1].name, 'wordmark');

    assert.ok(manifest[1].jsdoc.includes('Wordmark'));
    assert.deepEqual(manifest[1].supportedShapes, ['hero', 'chrome']);
    assert.deepEqual(manifest[0].supportedShapes, ['kpi']);
  } finally {
    cleanDir(dir);
  }
});

test('buildManifest: excludes index.ts', () => {
  const dir = makeTmpDir();
  try {
    writeFile(dir, 'index.ts', `export * from './Wordmark';`);
    writeFile(dir, 'Card.tsx', `/**\n * Card\n * Supported morph shapes: card\n */\nexport default function Card() {}`);

    const manifest = buildManifest({ primitivesDir: dir });
    const names = manifest.map(m => m.name);
    assert.ok(!names.includes('index'), 'index.ts should be excluded');
    assert.ok(names.includes('card'));
  } finally {
    cleanDir(dir);
  }
});

test('buildManifest: excludes connectors subdirectory', () => {
  const dir = makeTmpDir();
  const connectorsDir = path.join(dir, 'connectors');
  fs.mkdirSync(connectorsDir);
  try {
    writeFile(dir, 'Logo.tsx', `/**\n * Logo\n * Supported morph shapes: hero\n */\nexport default function Logo() {}`);
    writeFile(connectorsDir, 'slack.tsx', `/**\n * Slack connector\n * Supported morph shapes: cluster\n */\nexport default function Slack() {}`);
    writeFile(connectorsDir, 'index.ts', `export * from './slack';`);

    const manifest = buildManifest({ primitivesDir: dir });
    const names = manifest.map(m => m.name);
    assert.ok(names.includes('logo'), 'Logo.tsx should be included');
    assert.ok(!names.includes('slack'), 'connectors/slack.tsx should be excluded');
    assert.ok(!names.includes('index'), 'connectors/index.ts should be excluded');
  } finally {
    cleanDir(dir);
  }
});

test('buildManifest: excludes __tests__ subdirectory', () => {
  const dir = makeTmpDir();
  const testsDir = path.join(dir, '__tests__');
  fs.mkdirSync(testsDir);
  try {
    writeFile(dir, 'Quote.tsx', `/**\n * Quote\n * Supported morph shapes: quote\n */\nexport default function Quote() {}`);
    writeFile(testsDir, 'Quote.test.ts', `import { buildManifest } from '../primitive-manifest.cjs';`);

    const manifest = buildManifest({ primitivesDir: dir });
    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].name, 'quote');
  } finally {
    cleanDir(dir);
  }
});

test('buildManifest: returns empty array for missing directory', () => {
  const manifest = buildManifest({ primitivesDir: '/nonexistent/path/that/does/not/exist' });
  assert.deepEqual(manifest, []);
});

test('buildManifest: handles primitive with no JSDoc gracefully', () => {
  const dir = makeTmpDir();
  try {
    writeFile(dir, 'Bare.tsx', `import React from 'react';\nexport default function Bare() { return null; }`);

    const manifest = buildManifest({ primitivesDir: dir });
    assert.equal(manifest.length, 1);
    assert.equal(manifest[0].name, 'bare');
    assert.equal(manifest[0].jsdoc, '');
    assert.deepEqual(manifest[0].supportedShapes, []);
  } finally {
    cleanDir(dir);
  }
});
