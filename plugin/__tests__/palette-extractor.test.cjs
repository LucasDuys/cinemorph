// T014 acceptance test: palette-extractor stub determinism + error paths.
// Run: node plugin/__tests__/palette-extractor.test.cjs

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { extractPalette, ROLES, MAX_BYTES } = require('../scripts/palette-extractor.cjs');

function tmpFile(name, buf) {
  const f = path.join(os.tmpdir(), `t014pal-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
  fs.writeFileSync(f, buf);
  return f;
}

test('extracts 5 hex tokens for the 5 roles from a tiny PNG fixture', () => {
  // 1x1 transparent PNG (smallest valid PNG).
  const png = Buffer.from(
    '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636000010000000500010D0A2DB40000000049454E44AE426082',
    'hex'
  );
  const f = tmpFile('tiny.png', png);
  const palette = extractPalette(f);
  for (const role of ROLES) {
    assert.match(palette[role], /^#[0-9A-F]{6}$/, `${role} should be 6-char hex`);
  }
});

test('deterministic: same input → same palette', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const f = tmpFile('det.bin', buf);
  const a = extractPalette(f);
  const b = extractPalette(f);
  assert.deepEqual(a, b);
});

test('throws clear error on missing file', () => {
  assert.throws(() => extractPalette('/no/such/file.png'), /not found/);
});

test('throws on oversized file (size check before read)', () => {
  // Create a sparse-style file by writing a 6 MB buffer.
  const big = Buffer.alloc(MAX_BYTES + 1024);
  const f = tmpFile('big.bin', big);
  assert.throws(() => extractPalette(f), /too large/);
});
