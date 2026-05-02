// T006: qa-prompt.test.cjs — unit tests for qa-prompt.cjs.
// Uses node:test. Tests prompt structure and user message construction.

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const {
  buildSystemPrompt,
  buildUserPrompt,
  buildSystemPromptWith3D,
} = require('../qa-prompt.cjs');

// ---------------------------------------------------------------------------
// buildSystemPrompt — rubric axes presence
// ---------------------------------------------------------------------------

test('buildSystemPrompt returns a non-empty string', () => {
  const prompt = buildSystemPrompt();
  assert.ok(typeof prompt === 'string' && prompt.length > 0, 'prompt must be a non-empty string');
});

test('buildSystemPrompt contains "legibility" rubric axis', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.toLowerCase().includes('legibility'), 'must contain legibility axis');
});

test('buildSystemPrompt contains "overlap" rubric axis', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.toLowerCase().includes('overlap'), 'must contain overlap axis');
});

test('buildSystemPrompt contains "hierarchy" rubric axis', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.toLowerCase().includes('hierarchy'), 'must contain hierarchy axis');
});

test('buildSystemPrompt contains "brand" rubric axis', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.toLowerCase().includes('brand'), 'must contain brand axis');
});

test('buildSystemPrompt contains "composition" rubric axis', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.toLowerCase().includes('composition'), 'must contain composition axis');
});

test('buildSystemPrompt contains "onbrand" or "on-brand" rubric axis', () => {
  const prompt = buildSystemPrompt();
  assert.ok(
    prompt.toLowerCase().includes('onbrand') || prompt.toLowerCase().includes('on-brand'),
    'must contain on-brand / onbrand axis'
  );
});

test('buildSystemPrompt contains "cinematic" rubric axis', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.toLowerCase().includes('cinematic'), 'must contain cinematic axis');
});

test('buildSystemPrompt instructs response JSON schema (scores + issues)', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.includes('scores'), 'must reference scores in schema instruction');
  assert.ok(prompt.includes('issues'), 'must reference issues in schema instruction');
  assert.ok(prompt.includes('severity'), 'must reference severity field');
});

test('buildSystemPrompt mentions WCAG contrast spec (4.5)', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.includes('4.5'), 'must mention WCAG 4.5:1 contrast threshold');
});

test('buildSystemPrompt mentions 32px headline size', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.includes('32'), 'must mention minimum 32px headline size');
});

test('buildSystemPrompt mentions delta-E brand tolerance', () => {
  const prompt = buildSystemPrompt();
  assert.ok(
    prompt.includes('ΔE') || prompt.includes('deltaE') || prompt.includes('delta-E') || prompt.includes('15'),
    'must mention ΔE<15 brand match threshold'
  );
});

// ---------------------------------------------------------------------------
// buildUserPrompt — structure and 5MB guard
// ---------------------------------------------------------------------------

test('buildUserPrompt throws if PNG file does not exist', () => {
  assert.throws(
    () => buildUserPrompt({
      pngPath: '/nonexistent/stage.png',
      stageName: 'slide-1',
      captionText: 'Test caption',
      tokens: {},
    }),
    /not found|does not exist|ENOENT/i,
    'must throw when PNG file does not exist'
  );
});

test('buildUserPrompt throws for PNG > 5MB before any API call', () => {
  // Create a real temp file >5MB.
  const tmpFile = path.join(os.tmpdir(), 'morph-deck-test-large.png');
  // Write 6MB of zeroes.
  const buf = Buffer.alloc(6 * 1024 * 1024, 0);
  fs.writeFileSync(tmpFile, buf);

  try {
    assert.throws(
      () => buildUserPrompt({
        pngPath: tmpFile,
        stageName: 'slide-big',
        captionText: 'Test',
        tokens: {},
      }),
      /5\s*MB|file too large|exceeds/i,
      'must throw with size error for PNG > 5MB'
    );
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test('buildUserPrompt returns array with image block and text block for valid PNG', () => {
  // Create a minimal valid temp PNG (1x1 pixel PNG binary).
  const tmpFile = path.join(os.tmpdir(), 'morph-deck-test-tiny.png');
  // Minimal 1x1 white PNG (67 bytes).
  const minimalPng = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e00000000c4944415478016360f8cfc00000000200017de4220000000049454e44ae426082',
    'hex'
  );
  fs.writeFileSync(tmpFile, minimalPng);

  try {
    const result = buildUserPrompt({
      pngPath: tmpFile,
      stageName: 'slide-1',
      captionText: 'Opening hook',
      tokens: { background: '#0a0a0f', foreground: '#ffffff', accent: '#6366f1' },
    });

    assert.ok(Array.isArray(result), 'result must be an array');
    assert.equal(result.length, 2, 'must have exactly 2 message blocks');

    // First block: image.
    const imageBlock = result[0];
    assert.equal(imageBlock.type, 'image', 'first block must be image type');
    assert.equal(imageBlock.source.type, 'base64', 'image source type must be base64');
    assert.equal(imageBlock.source.media_type, 'image/png', 'media_type must be image/png');
    assert.ok(typeof imageBlock.source.data === 'string' && imageBlock.source.data.length > 0, 'base64 data must be non-empty string');

    // Second block: text.
    const textBlock = result[1];
    assert.equal(textBlock.type, 'text', 'second block must be text type');
    assert.ok(typeof textBlock.text === 'string' && textBlock.text.length > 0, 'text must be non-empty string');
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test('buildUserPrompt text block includes stageName and captionText', () => {
  const tmpFile = path.join(os.tmpdir(), 'morph-deck-test-content.png');
  const minimalPng = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e00000000c4944415478016360f8cfc00000000200017de4220000000049454e44ae426082',
    'hex'
  );
  fs.writeFileSync(tmpFile, minimalPng);

  try {
    const result = buildUserPrompt({
      pngPath: tmpFile,
      stageName: 'hero-slide',
      captionText: 'The problem we solve',
      tokens: { background: '#0a0a0f', accent: '#6366f1' },
    });

    const textBlock = result[1];
    assert.ok(textBlock.text.includes('hero-slide'), 'text block must include stageName');
    assert.ok(textBlock.text.includes('The problem we solve'), 'text block must include captionText');
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

test('buildUserPrompt text block includes resolved token values', () => {
  const tmpFile = path.join(os.tmpdir(), 'morph-deck-test-tokens.png');
  const minimalPng = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e00000000c4944415478016360f8cfc00000000200017de4220000000049454e44ae426082',
    'hex'
  );
  fs.writeFileSync(tmpFile, minimalPng);

  try {
    const result = buildUserPrompt({
      pngPath: tmpFile,
      stageName: 'token-test',
      captionText: 'tokens test',
      tokens: { background: '#deadbe', foreground: '#ffffff', accent: '#cafef0' },
    });

    const textBlock = result[1];
    assert.ok(textBlock.text.includes('#deadbe') || textBlock.text.includes('deadbe'), 'background token must appear in text');
    assert.ok(textBlock.text.includes('#cafef0') || textBlock.text.includes('cafef0'), 'accent token must appear in text');
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

// ---------------------------------------------------------------------------
// buildSystemPromptWith3D — 3D extension axes presence
// ---------------------------------------------------------------------------

test('buildSystemPromptWith3D returns a non-empty string', () => {
  const prompt = buildSystemPromptWith3D();
  assert.ok(typeof prompt === 'string' && prompt.length > 0, 'prompt must be a non-empty string');
});

test('buildSystemPromptWith3D contains all 7 original rubric axes', () => {
  const prompt = buildSystemPromptWith3D();
  const axes = ['legibility', 'overlap', 'hierarchy', 'brand', 'composition', 'onbrand', 'cinematic'];
  axes.forEach(axis => {
    assert.ok(
      prompt.toLowerCase().includes(axis),
      `must contain original axis "${axis}"`
    );
  });
});

test('buildSystemPromptWith3D contains "spatial coherence" rubric axis', () => {
  const prompt = buildSystemPromptWith3D();
  assert.ok(
    prompt.toLowerCase().includes('spatial coherence'),
    'must contain "spatial coherence" axis'
  );
});

test('buildSystemPromptWith3D contains "motion sensibility" rubric axis', () => {
  const prompt = buildSystemPromptWith3D();
  assert.ok(
    prompt.toLowerCase().includes('motion sensibility'),
    'must contain "motion sensibility" axis'
  );
});

test('buildSystemPromptWith3D contains "tasteful" rubric axis', () => {
  const prompt = buildSystemPromptWith3D();
  const lowerPrompt = prompt.toLowerCase();
  // Check for "tasteful" as a standalone word or "tasteful vs gratuitous"
  assert.ok(
    lowerPrompt.includes('tasteful'),
    'must contain "tasteful" axis'
  );
});

test('buildSystemPromptWith3D extended JSON schema includes spatial, motion_sensibility, tasteful scores', () => {
  const prompt = buildSystemPromptWith3D();
  assert.ok(
    prompt.includes('"spatial"'),
    'schema must include "spatial" score field'
  );
  assert.ok(
    prompt.includes('"motion_sensibility"'),
    'schema must include "motion_sensibility" score field'
  );
  assert.ok(
    prompt.includes('"tasteful"'),
    'schema must include "tasteful" score field'
  );
});

test('buildSystemPrompt remains unchanged with 7 axes only', () => {
  const prompt = buildSystemPrompt();
  // Should NOT contain any of the 3D-specific axis names.
  assert.ok(!prompt.toLowerCase().includes('spatial coherence'), 'base prompt should not include spatial coherence');
  assert.ok(!prompt.toLowerCase().includes('motion sensibility'), 'base prompt should not include motion sensibility');
  // Note: "tasteful" might appear in English elsewhere, so check for the full pattern.
  // Instead verify the schema doesn't include the 3D score keys.
  assert.ok(!prompt.includes('"spatial"'), 'base schema must not include spatial score');
  assert.ok(!prompt.includes('"motion_sensibility"'), 'base schema must not include motion_sensibility score');
  assert.ok(!prompt.includes('"tasteful"'), 'base schema must not include tasteful score');
});

test('buildSystemPromptWith3D includes r3f-targeted fix suggestions guidance', () => {
  const prompt = buildSystemPromptWith3D();
  // Check for guidance on r3f prop fix suggestions.
  assert.ok(
    prompt.toLowerCase().includes('rotationspeed') || prompt.toLowerCase().includes('rotation_speed') || prompt.toLowerCase().includes('reduce'),
    'should include guidance on rotationSpeed reduction'
  );
  assert.ok(
    prompt.toLowerCase().includes('count'),
    'should include guidance on point/cube count reduction'
  );
  assert.ok(
    prompt.toLowerCase().includes('geometry') || prompt.toLowerCase().includes('box'),
    'should include guidance on geometry switching'
  );
});
