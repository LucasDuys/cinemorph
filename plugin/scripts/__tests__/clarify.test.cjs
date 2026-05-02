// T018: clarify.test.cjs — unit tests for runClarify.
// Uses node:test. _promptFn injected to avoid interactive stdin.

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const {
  runClarify,
  detectMissingDimensions,
  parseAnswer,
  buildClarificationsText,
  persistBriefJson,
  DIMENSIONS,
  MAX_QUESTIONS,
} = require('../clarify.cjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDeck() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'morph-clarify-'));
  fs.mkdirSync(path.join(base, '.morph-deck'), { recursive: true });
  return base;
}

/**
 * Create a _promptFn that returns answers from the provided queue.
 * Throws if called more times than there are answers.
 */
function makeAnswerQueue(answers) {
  let i = 0;
  return async (_question) => {
    if (i >= answers.length) throw new Error('promptFn called more times than answers provided');
    return answers[i++];
  };
}

// ---------------------------------------------------------------------------
// parseAnswer
// ---------------------------------------------------------------------------

test('parseAnswer: letter A returns mapped option value', () => {
  const opts = { A: 'Investors / VCs', B: 'Technical team' };
  const result = parseAnswer('A', opts);
  assert.equal(result.isIdk, false);
  assert.equal(result.value, 'Investors / VCs');
});

test('parseAnswer: lowercase letter is accepted', () => {
  const opts = { A: 'Investors / VCs', B: 'Technical team' };
  const result = parseAnswer('a', opts);
  assert.equal(result.isIdk, false);
  assert.equal(result.value, 'Investors / VCs');
});

test('parseAnswer: idk returns isIdk=true', () => {
  const opts = { A: 'foo', B: 'bar' };
  const result = parseAnswer('idk', opts);
  assert.equal(result.isIdk, true);
  assert.equal(result.value, null);
});

test('parseAnswer: skip returns isIdk=true', () => {
  const opts = { A: 'foo' };
  const result = parseAnswer('skip', opts);
  assert.equal(result.isIdk, true);
});

test('parseAnswer: empty string treated as idk', () => {
  const opts = { A: 'foo' };
  const result = parseAnswer('', opts);
  assert.equal(result.isIdk, true);
});

test('parseAnswer: free-text pass-through if no match', () => {
  const opts = { A: 'foo', B: 'bar' };
  const result = parseAnswer('Custom audience text', opts);
  assert.equal(result.isIdk, false);
  assert.equal(result.value, 'Custom audience text');
});

// ---------------------------------------------------------------------------
// detectMissingDimensions
// ---------------------------------------------------------------------------

test('detectMissingDimensions: empty brief returns all 5 dimensions', () => {
  const dims = detectMissingDimensions('', []);
  assert.equal(dims.length, DIMENSIONS.length);
});

test('detectMissingDimensions: brief with explicit audience reduces missing set', () => {
  const dims = detectMissingDimensions('Series A pitch for investors and VCs', []);
  const keys = dims.map(d => d.key);
  assert.ok(!keys.includes('audience'), 'audience should be detected from brief');
});

test('detectMissingDimensions: missingFields from token-merger force inclusion', () => {
  // Even if brief mentions audience, if token-merger flags it, it must appear.
  const dims = detectMissingDimensions('This is for investors', ['audience']);
  const keys = dims.map(d => d.key);
  assert.ok(keys.includes('audience'));
});

test('detectMissingDimensions: deckLength detected from slide count in brief', () => {
  const dims = detectMissingDimensions('5-slide pitch for Series A', []);
  const keys = dims.map(d => d.key);
  assert.ok(!keys.includes('deckLength'), 'deckLength should be detected from "5-slide"');
});

// ---------------------------------------------------------------------------
// buildClarificationsText
// ---------------------------------------------------------------------------

test('buildClarificationsText: empty answers returns empty string', () => {
  assert.equal(buildClarificationsText({}), '');
});

test('buildClarificationsText: single answer produces correct format', () => {
  const text = buildClarificationsText({ audience: 'Investors / VCs' });
  assert.ok(text.includes('Clarification answers:'));
  assert.ok(text.includes('Target audience: Investors / VCs'));
});

test('buildClarificationsText: multiple answers all appear', () => {
  const text = buildClarificationsText({
    audience: 'Investors / VCs',
    toneVoice: 'clean and minimal',
  });
  assert.ok(text.includes('Investors / VCs'));
  assert.ok(text.includes('clean and minimal'));
});

// ---------------------------------------------------------------------------
// persistBriefJson
// ---------------------------------------------------------------------------

test('persistBriefJson: writes file and returns path', () => {
  const deckPath = makeTempDeck();
  const briefJson = { brief: 'test', audience: 'Investors / VCs' };
  const filePath = persistBriefJson(deckPath, briefJson);
  assert.ok(fs.existsSync(filePath));
  const written = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  assert.equal(written.audience, 'Investors / VCs');
});

test('persistBriefJson: merges over existing content', () => {
  const deckPath = makeTempDeck();
  // First write.
  persistBriefJson(deckPath, { audience: 'Investors' });
  // Second write with new key.
  persistBriefJson(deckPath, { toneVoice: 'minimal' });
  const merged = JSON.parse(fs.readFileSync(path.join(deckPath, '.morph-deck', 'brief.json'), 'utf8'));
  assert.equal(merged.audience, 'Investors');
  assert.equal(merged.toneVoice, 'minimal');
});

// ---------------------------------------------------------------------------
// runClarify integration
// ---------------------------------------------------------------------------

test('runClarify: idk answer emits defaultGuess and records it in briefJson', async () => {
  const deckPath = makeTempDeck();
  // Provide enough idk answers to cover the first dimension asked.
  const answers = Array(MAX_QUESTIONS).fill('idk');
  const result = await runClarify({
    brief: '',   // empty -> all dims needed
    deckPath,
    _promptFn: makeAnswerQueue(answers),
  });

  assert.ok(typeof result.clarifications === 'string');
  assert.ok(typeof result.briefJson === 'object');
  assert.ok(typeof result.persistedPath === 'string');
  assert.ok(fs.existsSync(result.persistedPath));
  // briefJson should include the 3 defaultGuesses.
  const written = JSON.parse(fs.readFileSync(result.persistedPath, 'utf8'));
  assert.ok(Object.keys(written).length >= 3);
});

test('runClarify: letter answer captured correctly', async () => {
  const deckPath = makeTempDeck();
  // Only audience is missing (others are in brief).
  const answers = ['A']; // A = Investors / VCs
  const result = await runClarify({
    brief: '5-slide video pitch with cinematic tone, metrics and KPIs required',
    deckPath,
    _promptFn: makeAnswerQueue(answers),
  });

  const written = JSON.parse(fs.readFileSync(result.persistedPath, 'utf8'));
  assert.equal(written.audience, 'Investors / VCs');
});

test('runClarify: at most MAX_QUESTIONS questions asked regardless of missing count', async () => {
  const deckPath = makeTempDeck();
  let callCount = 0;
  const countingPrompt = async () => { callCount++; return 'idk'; };

  await runClarify({
    brief: '',   // empty -> all 5 dims
    deckPath,
    _promptFn: countingPrompt,
  });

  assert.ok(callCount <= MAX_QUESTIONS, `Expected at most ${MAX_QUESTIONS} calls, got ${callCount}`);
});

test('runClarify: brief with all signals -> no questions asked', async () => {
  const deckPath = makeTempDeck();
  let callCount = 0;
  const countingPrompt = async () => { callCount++; return 'A'; };

  // Brief contains all 5 signals.
  const richBrief = [
    'Investors pitch, 5-slide deck.',
    'Presented live on projector.',
    'Cinematic tone and voice.',
    'Must include key metrics and KPIs.',
  ].join(' ');

  await runClarify({
    brief: richBrief,
    deckPath,
    _promptFn: countingPrompt,
  });

  assert.equal(callCount, 0, 'no questions should be asked when brief covers all dimensions');
});

test('runClarify: persistedPath is inside deckPath/.morph-deck/brief.json', async () => {
  const deckPath = makeTempDeck();
  const result = await runClarify({
    brief: 'investors 5-slide live cinematic kpi',
    deckPath,
    _promptFn: makeAnswerQueue([]),
  });
  assert.equal(result.persistedPath, path.join(deckPath, '.morph-deck', 'brief.json'));
});
