// Tests for dist_dir.mjs — R012 output dir hygiene.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDist, ensureGitignore, artifactPath } from '../dist_dir.mjs';

async function makeTmp() {
  return mkdtemp(join(tmpdir(), 'morph-deck-test-'));
}

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

test('ensureDist creates dist dir', async () => {
  const deck = await makeTmp();
  try {
    const dist = await ensureDist(deck);
    assert.equal(dist, join(deck, 'dist'));
    assert.ok(await exists(dist));
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});

test('ensureDist is idempotent', async () => {
  const deck = await makeTmp();
  try {
    const d1 = await ensureDist(deck);
    await writeFile(join(d1, 'marker.txt'), 'keep me', 'utf8');
    const d2 = await ensureDist(deck);
    assert.equal(d1, d2);
    assert.ok(await exists(join(d2, 'marker.txt')));
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});

test('ensureDist with clean=true wipes existing', async () => {
  const deck = await makeTmp();
  try {
    const dist = await ensureDist(deck);
    await writeFile(join(dist, 'stale.txt'), 'old', 'utf8');
    assert.ok(await exists(join(dist, 'stale.txt')));
    const dist2 = await ensureDist(deck, { clean: true });
    assert.ok(await exists(dist2));
    assert.equal(await exists(join(dist2, 'stale.txt')), false);
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});

test('ensureGitignore creates when missing', async () => {
  const deck = await makeTmp();
  try {
    await ensureGitignore(deck);
    const content = await readFile(join(deck, '.gitignore'), 'utf8');
    assert.ok(content.split(/\r?\n/).includes('dist/'));
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});

test('ensureGitignore appends when entry missing', async () => {
  const deck = await makeTmp();
  try {
    const gi = join(deck, '.gitignore');
    await writeFile(gi, 'node_modules/\n.env\n', 'utf8');
    await ensureGitignore(deck);
    const lines = (await readFile(gi, 'utf8')).split(/\r?\n/);
    assert.ok(lines.includes('dist/'));
    assert.ok(lines.includes('node_modules/'));
    assert.ok(lines.includes('.env'));
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});

test('ensureGitignore is idempotent when entry already present', async () => {
  const deck = await makeTmp();
  try {
    const gi = join(deck, '.gitignore');
    await writeFile(gi, 'dist/\n', 'utf8');
    await ensureGitignore(deck);
    await ensureGitignore(deck);
    const content = await readFile(gi, 'utf8');
    const occurrences = content.split('dist/').length - 1;
    assert.equal(occurrences, 1);
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});

test('ensureGitignore handles no trailing newline', async () => {
  const deck = await makeTmp();
  try {
    const gi = join(deck, '.gitignore');
    await writeFile(gi, 'node_modules/', 'utf8');  // no trailing newline
    await ensureGitignore(deck);
    const lines = (await readFile(gi, 'utf8')).split(/\r?\n/);
    assert.ok(lines.includes('dist/'));
    assert.ok(lines.includes('node_modules/'));
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});

test('artifactPath returns deterministic path', async () => {
  const deck = await makeTmp();
  try {
    const p1 = await artifactPath(deck, 'deck.pptx');
    const p2 = await artifactPath(deck, 'deck.pptx');
    assert.equal(p1, p2);
    assert.equal(p1, join(deck, 'dist', 'deck.pptx'));
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});

test('artifactPath creates dist as side effect', async () => {
  const deck = await makeTmp();
  try {
    assert.equal(await exists(join(deck, 'dist')), false);
    const p = await artifactPath(deck, 'video.mp4');
    assert.ok(await exists(join(deck, 'dist')));
    assert.equal(p, join(deck, 'dist', 'video.mp4'));
  } finally {
    await rm(deck, { recursive: true, force: true });
  }
});
