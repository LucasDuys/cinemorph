'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { extractPalette, ROLES, MAX_BYTES } = require('../palette-extractor.cjs');

function tmpfile(contents, ext = '.png') {
  const p = path.join(os.tmpdir(), `palette-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  fs.writeFileSync(p, contents);
  return p;
}

test('returns 5 hex colors keyed by ROLES', () => {
  const img = tmpfile(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]));
  try {
    const palette = extractPalette(img);
    for (const role of ROLES) {
      assert.ok(role in palette, `missing role: ${role}`);
      assert.match(palette[role], /^#[0-9A-F]{6}$/, `${role} not a valid hex`);
    }
  } finally {
    fs.unlinkSync(img);
  }
});

test('output is deterministic for same input', () => {
  const img = tmpfile(Buffer.from('deterministic-bytes-here-for-hashing'));
  try {
    const a = extractPalette(img);
    const b = extractPalette(img);
    assert.deepEqual(a, b);
  } finally {
    fs.unlinkSync(img);
  }
});

test('different inputs produce different palettes', () => {
  const a = tmpfile(Buffer.from('input-A'));
  const b = tmpfile(Buffer.from('input-B'));
  try {
    const pa = extractPalette(a);
    const pb = extractPalette(b);
    assert.notEqual(pa.background, pb.background);
  } finally {
    fs.unlinkSync(a);
    fs.unlinkSync(b);
  }
});

test('throws clear error on missing file', () => {
  assert.throws(
    () => extractPalette('/nonexistent/path/to/image.png'),
    /file not found/i
  );
});

test('throws on oversized file', () => {
  // Create a file just over the 5MB cap
  const big = path.join(os.tmpdir(), `palette-big-${Date.now()}.png`);
  const fd = fs.openSync(big, 'w');
  fs.writeSync(fd, Buffer.alloc(1), 0, 1, MAX_BYTES);
  fs.closeSync(fd);
  try {
    assert.throws(
      () => extractPalette(big),
      /image too large/i
    );
  } finally {
    fs.unlinkSync(big);
  }
});
