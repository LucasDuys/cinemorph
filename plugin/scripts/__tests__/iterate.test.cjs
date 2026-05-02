// T017: iterate.test.cjs — unit tests for iterateDeck.
// Uses node:test. All FS operations use temp directories.
// _composeFn and _verifyFn are injected to avoid real Claude / build calls.

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const { iterateDeck } = require('../iterate.cjs');

// ---- Helpers ---------------------------------------------------------------

function makeTempDeck(name = 'deck') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'morph-iter-'));
  const deck = path.join(base, name);
  fs.mkdirSync(path.join(deck, 'src', 'deck'), { recursive: true });
  fs.mkdirSync(path.join(deck, '.morph-deck'), { recursive: true });
  // Write minimal source files so readOrEmpty has something.
  fs.writeFileSync(path.join(deck, 'src', 'deck', 'stages.ts'), "export const STAGES = [];\n");
  fs.writeFileSync(path.join(deck, 'src', 'deck', 'data.ts'),   "export const DATA = {};\n");
  fs.writeFileSync(path.join(deck, 'src', 'deck', 'tokens.ts'), "export const TOKENS = {};\n");
  return { base, deck };
}

function readHistory(deck) {
  const file = path.join(deck, '.morph-deck', 'history.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

// A compose fn that returns a diff-mode patch.
function makeDiffCompose(hunkBefore, hunkAfter) {
  return async () => ({
    patch: {
      files: {
        'src/deck/stages.ts': {
          mode: 'diff',
          hunks: [{ before: hunkBefore, after: hunkAfter }],
        },
      },
    },
    summary: 'applied test hunk',
  });
}

// A compose fn that returns full-file replacements.
function makeReplaceCompose(stagesTs) {
  return async () => ({ stagesTs, summary: 'full replace' });
}

const okVerify = async () => ({
  ok: true,
  screenshot: '/tmp/fake-deck/dist/preview-stage-1.png',
});

const failVerify = async () => ({
  ok: false,
  errors: ['Uncaught TypeError: Cannot read properties of undefined'],
});

// ---- Tests -----------------------------------------------------------------

test('diff-mode patch is applied and history entry status=ok is appended', async () => {
  const { deck, base } = makeTempDeck();

  const result = await iterateDeck({
    change: 'Make the title bolder',
    deckPath: deck,
    cwd: base,
    _composeFn: makeDiffCompose('export const STAGES = [];', 'export const STAGES = [/* updated */];'),
    _verifyFn: okVerify,
  });

  assert.equal(result.ok, true);

  const stagesContent = fs.readFileSync(path.join(deck, 'src', 'deck', 'stages.ts'), 'utf8');
  assert.ok(stagesContent.includes('/* updated */'), 'diff hunk should be applied');

  const history = readHistory(deck);
  assert.equal(history.length, 1);
  assert.equal(history[0].status, 'ok');
  assert.equal(history[0].change, 'Make the title bolder');
  assert.ok(Array.isArray(history[0].files));
  assert.ok(typeof history[0].ts === 'string');
});

test('full-replacement patch applied and history entry recorded', async () => {
  const { deck, base } = makeTempDeck();
  const newContent = "export const STAGES = [{ id: 'new' }];\n";

  const result = await iterateDeck({
    change: 'Replace stages entirely',
    deckPath: deck,
    cwd: base,
    _composeFn: makeReplaceCompose(newContent),
    _verifyFn: okVerify,
  });

  assert.equal(result.ok, true);
  const written = fs.readFileSync(path.join(deck, 'src', 'deck', 'stages.ts'), 'utf8');
  assert.equal(written, newContent);

  const history = readHistory(deck);
  assert.equal(history.length, 1);
  assert.equal(history[0].status, 'ok');
});

test('verify-loop failure: history entry gets status=failed with error excerpt', async () => {
  const { deck, base } = makeTempDeck();

  const result = await iterateDeck({
    change: 'Bad change that breaks build',
    deckPath: deck,
    cwd: base,
    _composeFn: makeReplaceCompose('export const STAGES = [bad syntax};\n'),
    _verifyFn: failVerify,
  });

  assert.equal(result.ok, false);

  const history = readHistory(deck);
  assert.equal(history.length, 1);
  assert.equal(history[0].status, 'failed');
  assert.ok(typeof history[0].error === 'string');
  assert.ok(history[0].error.length > 0);
});

test('empty change is a no-op: logs warning, no history written', async () => {
  const { deck, base } = makeTempDeck();
  let composeCalled = false;
  const _composeFn = async () => { composeCalled = true; return {}; };

  const result = await iterateDeck({
    change: '   ',
    deckPath: deck,
    cwd: base,
    _composeFn,
    _verifyFn: okVerify,
  });

  assert.equal(result.ok, true);
  assert.equal(composeCalled, false, 'composer should not be called for empty change');
  // No history file should be created (or it should be empty).
  const historyFile = path.join(deck, '.morph-deck', 'history.jsonl');
  const exists = fs.existsSync(historyFile);
  if (exists) {
    const lines = fs.readFileSync(historyFile, 'utf8').split('\n').filter(Boolean);
    assert.equal(lines.length, 0, 'no history entries for no-op');
  }
});

test('active-deck resolution: explicit deckPath wins over auto-detect', async () => {
  // Create two decks — auto-detect would find the most-recently-touched one.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'morph-resolve-'));

  const deck1 = path.join(base, 'deck1');
  const deck2 = path.join(base, 'deck2');
  for (const d of [deck1, deck2]) {
    fs.mkdirSync(path.join(d, 'src', 'deck'), { recursive: true });
    fs.mkdirSync(path.join(d, '.morph-deck'), { recursive: true });
    fs.writeFileSync(path.join(d, 'src', 'deck', 'stages.ts'), "export const STAGES = [];\n");
    fs.writeFileSync(path.join(d, 'src', 'deck', 'data.ts'),   "export const DATA = {};\n");
    fs.writeFileSync(path.join(d, 'src', 'deck', 'tokens.ts'), "export const TOKENS = {};\n");
  }

  // Touch deck2's .morph-deck so auto-detect would pick it.
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(deck2, '.morph-deck'), later, later);

  let usedDeckPath = null;
  const captureDeck = async ({ deckPath }) => {
    usedDeckPath = deckPath;
    return { patch: { files: {} } };
  };

  await iterateDeck({
    change: 'test',
    deckPath: deck1,   // explicit — should win over deck2
    cwd: base,
    _composeFn: captureDeck,
    _verifyFn: okVerify,
  });

  assert.equal(usedDeckPath, deck1, 'explicit --deck should override auto-detection');
});
