// T017: diff-applier.test.cjs — unit tests for applyPatch.
// Uses node:test. All FS operations use a temp directory; no mocks needed.

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const { applyPatch } = require('../diff-applier.cjs');

// ---- Helpers ---------------------------------------------------------------

function makeTempDeck() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'morph-deck-test-'));
  fs.mkdirSync(path.join(base, 'src', 'deck'), { recursive: true });
  return base;
}

function writeFile(deckPath, rel, content) {
  const abs = path.join(deckPath, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

function readFile(deckPath, rel) {
  return fs.readFileSync(path.join(deckPath, rel), 'utf8');
}

// ---- Tests -----------------------------------------------------------------

test('replace mode: writes content to file, returns absolute path', () => {
  const deck = makeTempDeck();
  const newContent = 'export const STAGES = [];';

  const applied = applyPatch({
    deckPath: deck,
    patch: {
      files: {
        'src/deck/stages.ts': { mode: 'replace', content: newContent },
      },
    },
  });

  assert.equal(applied.length, 1);
  assert.equal(applied[0], path.resolve(deck, 'src/deck/stages.ts'));
  assert.equal(readFile(deck, 'src/deck/stages.ts'), newContent);
});

test('diff mode: finds and replaces a unique hunk', () => {
  const deck = makeTempDeck();
  const original = `export const STAGES = [\n  { id: 'intro', caption: 'Hello' },\n];\n`;
  writeFile(deck, 'src/deck/stages.ts', original);

  const applied = applyPatch({
    deckPath: deck,
    patch: {
      files: {
        'src/deck/stages.ts': {
          mode: 'diff',
          hunks: [{ before: "caption: 'Hello'", after: "caption: 'World'" }],
        },
      },
    },
  });

  assert.equal(applied.length, 1);
  const result = readFile(deck, 'src/deck/stages.ts');
  assert.ok(result.includes("caption: 'World'"), 'hunk should be applied');
  assert.ok(!result.includes("caption: 'Hello'"), 'old text should be gone');
});

test('diff mode: throws clear error when before not found', () => {
  const deck = makeTempDeck();
  writeFile(deck, 'src/deck/stages.ts', "export const STAGES = [];\n");

  assert.throws(
    () => applyPatch({
      deckPath: deck,
      patch: {
        files: {
          'src/deck/stages.ts': {
            mode: 'diff',
            hunks: [{ before: "caption: 'Nonexistent'", after: "caption: 'X'" }],
          },
        },
      },
    }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('not found'), `expected "not found" in: ${err.message}`);
      return true;
    }
  );
});

test('diff mode: throws clear error when before is not unique', () => {
  const deck = makeTempDeck();
  // Intentionally duplicate the target string.
  writeFile(deck, 'src/deck/stages.ts', "const x = 'dup';\nconst y = 'dup';\n");

  assert.throws(
    () => applyPatch({
      deckPath: deck,
      patch: {
        files: {
          'src/deck/stages.ts': {
            mode: 'diff',
            hunks: [{ before: "'dup'", after: "'unique'" }],
          },
        },
      },
    }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('not unique'), `expected "not unique" in: ${err.message}`);
      return true;
    }
  );
});

test('returns list of all affected file paths (multi-file patch)', () => {
  const deck = makeTempDeck();
  writeFile(deck, 'src/deck/stages.ts', "const A = 'old';\n");
  writeFile(deck, 'src/deck/data.ts', "const B = 'old';\n");

  const applied = applyPatch({
    deckPath: deck,
    patch: {
      files: {
        'src/deck/stages.ts': { mode: 'replace', content: "const A = 'new';\n" },
        'src/deck/data.ts':   { mode: 'replace', content: "const B = 'new';\n" },
      },
    },
  });

  assert.equal(applied.length, 2);
  const rels = applied.map(f => path.relative(deck, f).replace(/\\/g, '/'));
  assert.ok(rels.includes('src/deck/stages.ts'));
  assert.ok(rels.includes('src/deck/data.ts'));
});

test('empty patch (no files key): returns empty array without throwing', () => {
  const deck = makeTempDeck();
  const applied = applyPatch({ deckPath: deck, patch: { files: {} } });
  assert.deepEqual(applied, []);
});
