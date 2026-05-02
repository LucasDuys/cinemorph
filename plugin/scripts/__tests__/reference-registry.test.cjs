'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Use a temporary directory for the registry to avoid polluting the user's real ~/.claude/plugins/morph-deck/references/
const tmpRegistryRoot = path.join(os.tmpdir(), `morph-deck-registry-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Set the environment variable before requiring the module
process.env.MORPH_DECK_REFERENCES_DIR = tmpRegistryRoot;

// Now require the module
const { addReference, resolveReference, listReferences } = require('../reference-registry.cjs');

test('cleanup: create temp registry root', () => {
  fs.mkdirSync(tmpRegistryRoot, { recursive: true });
});

test('add reference: creates registry directory if absent', () => {
  // Start with a fresh temp directory for this specific test
  const testDir = path.join(os.tmpdir(), `morph-deck-test-dir-create-${Date.now()}`);
  const oldEnv = process.env.MORPH_DECK_REFERENCES_DIR;
  process.env.MORPH_DECK_REFERENCES_DIR = testDir;

  try {
    assert.equal(fs.existsSync(testDir), false, 'testDir should not exist initially');

    addReference({
      sourcePath: '/c/dev/test-deck',
      name: 'test-deck-001',
      brief: 'Test brief',
    });

    assert.ok(fs.existsSync(testDir), 'registry directory should be created');
    const regPath = path.join(testDir, 'test-deck-001.json');
    assert.ok(fs.existsSync(regPath), 'reference file should exist');

    // Cleanup
    fs.rmSync(testDir, { recursive: true });
  } finally {
    process.env.MORPH_DECK_REFERENCES_DIR = oldEnv;
  }
});

test('add reference: writes correct JSON structure', () => {
  const testDir = path.join(os.tmpdir(), `morph-deck-test-struct-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  const oldEnv = process.env.MORPH_DECK_REFERENCES_DIR;
  process.env.MORPH_DECK_REFERENCES_DIR = testDir;

  try {
    const sourcePath = '/c/dev/my-deck';
    const name = 'my-deck-ref';
    const brief = 'This is a test brief';

    addReference({
      sourcePath,
      name,
      brief,
    });

    const refPath = path.join(testDir, `${name}.json`);
    const content = JSON.parse(fs.readFileSync(refPath, 'utf8'));

    assert.equal(content.sourcePath, sourcePath);
    assert.equal(content.brief, brief);
    assert.ok(content.addedAt, 'addedAt should be populated');
    assert.equal(typeof content.addedAt, 'string', 'addedAt should be ISO string');
    // tokenSnapshot may be absent when not provided, which is fine

    // Cleanup
    fs.rmSync(testDir, { recursive: true });
  } finally {
    process.env.MORPH_DECK_REFERENCES_DIR = oldEnv;
  }
});

test('add reference: supports optional tokenSnapshot', () => {
  const testDir = path.join(os.tmpdir(), `morph-deck-test-tokens-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  const oldEnv = process.env.MORPH_DECK_REFERENCES_DIR;
  process.env.MORPH_DECK_REFERENCES_DIR = testDir;

  try {
    const tokens = { background: '#000000', foreground: '#FFFFFF' };

    addReference({
      sourcePath: '/c/dev/my-deck',
      name: 'with-tokens',
      brief: 'Test',
      tokenSnapshot: tokens,
    });

    const content = JSON.parse(fs.readFileSync(path.join(testDir, 'with-tokens.json'), 'utf8'));
    assert.deepEqual(content.tokenSnapshot, tokens);

    // Cleanup
    fs.rmSync(testDir, { recursive: true });
  } finally {
    process.env.MORPH_DECK_REFERENCES_DIR = oldEnv;
  }
});

test('resolve reference: by name looks up in registry', () => {
  const testDir = path.join(os.tmpdir(), `morph-deck-test-resolve-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  const oldEnv = process.env.MORPH_DECK_REFERENCES_DIR;
  process.env.MORPH_DECK_REFERENCES_DIR = testDir;

  try {
    const sourcePath = '/c/dev/my-registered-deck';
    addReference({
      sourcePath,
      name: 'my-ref',
      brief: 'Test',
    });

    const resolved = resolveReference('my-ref');
    assert.equal(resolved, sourcePath, 'resolved path should match original sourcePath');

    // Cleanup
    fs.rmSync(testDir, { recursive: true });
  } finally {
    process.env.MORPH_DECK_REFERENCES_DIR = oldEnv;
  }
});

test('resolve reference: by path returns path directly', () => {
  // If argument looks like a file path, return it directly without lookup
  const filePath1 = '/c/dev/decks/my-deck';
  const resolved1 = resolveReference(filePath1);
  assert.equal(resolved1, filePath1, 'absolute path with / should return as-is');

  const filePath2 = 'C:\\Users\\test\\deck';
  const resolved2 = resolveReference(filePath2);
  assert.equal(resolved2, filePath2, 'Windows path with \\ should return as-is');

  const filePath3 = './relative/path';
  const resolved3 = resolveReference(filePath3);
  assert.equal(resolved3, filePath3, 'relative path with . should return as-is');
});

test('resolve reference: unknown name throws error', () => {
  const testDir = path.join(os.tmpdir(), `morph-deck-test-unknown-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  const oldEnv = process.env.MORPH_DECK_REFERENCES_DIR;
  process.env.MORPH_DECK_REFERENCES_DIR = testDir;

  try {
    assert.throws(
      () => resolveReference('nonexistent-ref'),
      /not found|does not exist|cannot find/i,
      'should throw when reference not found'
    );

    // Cleanup
    fs.rmSync(testDir, { recursive: true });
  } finally {
    process.env.MORPH_DECK_REFERENCES_DIR = oldEnv;
  }
});

test('list references: returns all registered entries', () => {
  const testDir = path.join(os.tmpdir(), `morph-deck-test-list-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  const oldEnv = process.env.MORPH_DECK_REFERENCES_DIR;
  process.env.MORPH_DECK_REFERENCES_DIR = testDir;

  try {
    addReference({ sourcePath: '/deck1', name: 'deck1-ref', brief: 'Deck 1' });
    addReference({ sourcePath: '/deck2', name: 'deck2-ref', brief: 'Deck 2' });
    addReference({ sourcePath: '/deck3', name: 'deck3-ref', brief: 'Deck 3' });

    const refs = listReferences();
    assert.equal(refs.length, 3, 'should list all three references');
    assert.ok(refs.some(r => r.name === 'deck1-ref'), 'should include deck1-ref');
    assert.ok(refs.some(r => r.name === 'deck2-ref'), 'should include deck2-ref');
    assert.ok(refs.some(r => r.name === 'deck3-ref'), 'should include deck3-ref');

    // Each entry should have required fields
    refs.forEach(r => {
      assert.ok(r.name, 'each reference should have a name');
      assert.ok(r.sourcePath, 'each reference should have a sourcePath');
      assert.ok(r.addedAt, 'each reference should have addedAt');
    });

    // Cleanup
    fs.rmSync(testDir, { recursive: true });
  } finally {
    process.env.MORPH_DECK_REFERENCES_DIR = oldEnv;
  }
});

test('list references: empty registry returns empty array', () => {
  const testDir = path.join(os.tmpdir(), `morph-deck-test-empty-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  const oldEnv = process.env.MORPH_DECK_REFERENCES_DIR;
  process.env.MORPH_DECK_REFERENCES_DIR = testDir;

  try {
    const refs = listReferences();
    assert.equal(refs.length, 0, 'empty registry should return empty array');

    // Cleanup
    fs.rmSync(testDir, { recursive: true });
  } finally {
    process.env.MORPH_DECK_REFERENCES_DIR = oldEnv;
  }
});

test('cleanup: remove temp registry root', () => {
  if (fs.existsSync(tmpRegistryRoot)) {
    fs.rmSync(tmpRegistryRoot, { recursive: true });
  }
});
