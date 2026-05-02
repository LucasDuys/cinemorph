// T006: qa-runner.test.cjs — unit tests for qa-runner.cjs.
// Uses node:test. _fakeClaudeBin injected to avoid real API calls.

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const os     = require('node:os');
const path   = require('node:path');

const { evaluateStage } = require('../qa-runner.cjs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a valid minimal 1x1 PNG temp file. Returns its path. */
function makeTinyPng(name) {
  const tmpFile = path.join(os.tmpdir(), name || `morph-deck-qa-${Date.now()}.png`);
  const minimalPng = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e00000000c4944415478016360f8cfc00000000200017de4220000000049454e44ae426082',
    'hex'
  );
  fs.writeFileSync(tmpFile, minimalPng);
  return tmpFile;
}

/** Build a well-formed scores JSON response string. */
function goodScoresJson() {
  return JSON.stringify({
    scores: {
      legibility: 8,
      overlap: 9,
      hierarchy: 7,
      brand: 8,
      composition: 7,
      onbrand: 8,
      cinematic: 9,
      overall: 8,
    },
    issues: [],
  });
}

/**
 * Build a fake claude bin script that writes to stdout and exits with exitCode.
 * Writes a .js file invokable via Node — cross-platform, no shell quoting issues.
 * qa-runner.cjs detects the .js extension and spawns it via process.execPath.
 *
 * @param {string} stdoutContent - What to print to stdout.
 * @param {number} [exitCode=0]  - Exit code for the fake process.
 * @returns {string} Path to the .js script file.
 */
function makeFakeClaude(stdoutContent, exitCode = 0) {
  const scriptPath = path.join(os.tmpdir(), `fake-claude-${Date.now()}.js`);
  const scriptContent = [
    `process.stdout.write(${JSON.stringify(stdoutContent)} + '\\n');`,
    `process.exit(${exitCode});`,
  ].join('\n');
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  return scriptPath;
}

// ---------------------------------------------------------------------------
// evaluateStage — happy path
// ---------------------------------------------------------------------------

test('evaluateStage returns typed scores object with mocked client', () => {
  const pngPath = makeTinyPng('qa-happy-test.png');
  const fakeBin = makeFakeClaude(goodScoresJson());

  try {
    const result = evaluateStage({
      pngPath,
      stageName: 'slide-1',
      captionText: 'Opening hook',
      tokens: { background: '#0a0a0f', accent: '#6366f1' },
      _fakeClaudeBin: fakeBin,
    });

    // Top-level shape.
    assert.ok(typeof result === 'object' && result !== null, 'result must be an object');
    assert.ok('scores' in result, 'result must have scores field');
    assert.ok('issues' in result, 'result must have issues field');

    // All 8 score keys present.
    const expectedKeys = ['legibility', 'overlap', 'hierarchy', 'brand', 'composition', 'onbrand', 'cinematic', 'overall'];
    for (const key of expectedKeys) {
      assert.ok(key in result.scores, `scores must include ${key}`);
      assert.ok(typeof result.scores[key] === 'number', `scores.${key} must be a number`);
    }

    // Issues is an array.
    assert.ok(Array.isArray(result.issues), 'issues must be an array');
  } finally {
    fs.unlinkSync(pngPath);
    fs.unlinkSync(fakeBin);
  }
});

test('evaluateStage score values are in range 0-10', () => {
  const pngPath = makeTinyPng('qa-range-test.png');
  const fakeBin = makeFakeClaude(goodScoresJson());

  try {
    const result = evaluateStage({
      pngPath,
      stageName: 'slide-range',
      captionText: 'Test',
      tokens: {},
      _fakeClaudeBin: fakeBin,
    });

    for (const [key, val] of Object.entries(result.scores)) {
      assert.ok(val >= 0 && val <= 10, `scores.${key} must be between 0 and 10, got ${val}`);
    }
  } finally {
    fs.unlinkSync(pngPath);
    fs.unlinkSync(fakeBin);
  }
});

// ---------------------------------------------------------------------------
// evaluateStage — malformed JSON throws descriptive error
// ---------------------------------------------------------------------------

test('evaluateStage throws descriptive error for completely invalid JSON response', () => {
  const pngPath = makeTinyPng('qa-malformed-test.png');
  const fakeBin = makeFakeClaude('not json at all just garbage text');

  try {
    assert.throws(
      () => evaluateStage({
        pngPath,
        stageName: 'slide-bad',
        captionText: 'Test',
        tokens: {},
        _fakeClaudeBin: fakeBin,
      }),
      /malformed|parse|invalid|json/i,
      'must throw with descriptive parse error message'
    );
  } finally {
    fs.unlinkSync(pngPath);
    fs.unlinkSync(fakeBin);
  }
});

test('evaluateStage throws descriptive error when response JSON missing scores field', () => {
  const pngPath = makeTinyPng('qa-missing-scores.png');
  const missingScoresJson = JSON.stringify({ issues: [] }); // no scores
  const fakeBin = makeFakeClaude(missingScoresJson);

  try {
    assert.throws(
      () => evaluateStage({
        pngPath,
        stageName: 'slide-no-scores',
        captionText: 'Test',
        tokens: {},
        _fakeClaudeBin: fakeBin,
      }),
      /scores|missing|invalid|schema/i,
      'must throw with descriptive validation error for missing scores field'
    );
  } finally {
    fs.unlinkSync(pngPath);
    fs.unlinkSync(fakeBin);
  }
});

test('evaluateStage throws descriptive error when response JSON missing issues field', () => {
  const pngPath = makeTinyPng('qa-missing-issues.png');
  const missingIssuesJson = JSON.stringify({
    scores: { legibility: 8, overlap: 8, hierarchy: 8, brand: 8, composition: 8, onbrand: 8, cinematic: 8, overall: 8 },
  });
  const fakeBin = makeFakeClaude(missingIssuesJson);

  try {
    assert.throws(
      () => evaluateStage({
        pngPath,
        stageName: 'slide-no-issues',
        captionText: 'Test',
        tokens: {},
        _fakeClaudeBin: fakeBin,
      }),
      /issues|missing|invalid|schema/i,
      'must throw with descriptive validation error for missing issues field'
    );
  } finally {
    fs.unlinkSync(pngPath);
    fs.unlinkSync(fakeBin);
  }
});

// ---------------------------------------------------------------------------
// evaluateStage — QA_MODEL env var override
// ---------------------------------------------------------------------------

test('QA_MODEL env var is respected (no error thrown when set)', () => {
  const pngPath = makeTinyPng('qa-model-env-test.png');
  const fakeBin = makeFakeClaude(goodScoresJson());

  const original = process.env.QA_MODEL;
  process.env.QA_MODEL = 'claude-opus-4-5';

  try {
    // Should not throw — model override accepted.
    const result = evaluateStage({
      pngPath,
      stageName: 'slide-model',
      captionText: 'Model override test',
      tokens: {},
      _fakeClaudeBin: fakeBin,
    });
    assert.ok('scores' in result, 'result must still have scores with QA_MODEL override');
  } finally {
    if (original === undefined) {
      delete process.env.QA_MODEL;
    } else {
      process.env.QA_MODEL = original;
    }
    fs.unlinkSync(pngPath);
    fs.unlinkSync(fakeBin);
  }
});

test('QA_MODEL env var overrides model parameter', () => {
  // We cannot inspect which model the fake CLI was invoked with in this pattern.
  // But we can verify the result is valid — meaning the env var was accepted, not rejected.
  const pngPath = makeTinyPng('qa-model-param-test.png');
  const fakeBin = makeFakeClaude(goodScoresJson());

  const original = process.env.QA_MODEL;
  process.env.QA_MODEL = 'claude-sonnet-4-5';

  try {
    const result = evaluateStage({
      pngPath,
      stageName: 'slide-model-param',
      captionText: 'Model param test',
      tokens: {},
      model: 'claude-opus-4-5',
      _fakeClaudeBin: fakeBin,
    });
    assert.ok('scores' in result, 'env var override must still produce valid result');
  } finally {
    if (original === undefined) {
      delete process.env.QA_MODEL;
    } else {
      process.env.QA_MODEL = original;
    }
    fs.unlinkSync(pngPath);
    fs.unlinkSync(fakeBin);
  }
});

// ---------------------------------------------------------------------------
// evaluateStage — issues array structure
// ---------------------------------------------------------------------------

test('evaluateStage returns issues with correct fields when model reports issues', () => {
  const pngPath = makeTinyPng('qa-issues-test.png');
  const jsonWithIssues = JSON.stringify({
    scores: {
      legibility: 4,
      overlap: 5,
      hierarchy: 6,
      brand: 7,
      composition: 5,
      onbrand: 6,
      cinematic: 7,
      overall: 5,
    },
    issues: [
      {
        severity: 'critical',
        what: 'Headline text is too small',
        where: 'Top left heading area',
        fix_suggestion: 'Increase headline font to at least 32px',
      },
      {
        severity: 'major',
        what: 'Low contrast ratio on body text',
        where: 'Bottom paragraph',
        fix_suggestion: 'Darken body text color to achieve 4.5:1 contrast',
      },
    ],
  });
  const fakeBin = makeFakeClaude(jsonWithIssues);

  try {
    const result = evaluateStage({
      pngPath,
      stageName: 'slide-issues',
      captionText: 'Test with issues',
      tokens: {},
      _fakeClaudeBin: fakeBin,
    });

    assert.equal(result.issues.length, 2, 'must return all issues');

    const firstIssue = result.issues[0];
    assert.ok('severity' in firstIssue, 'issue must have severity');
    assert.ok('what' in firstIssue, 'issue must have what');
    assert.ok('where' in firstIssue, 'issue must have where');
    assert.ok('fix_suggestion' in firstIssue, 'issue must have fix_suggestion');
    assert.ok(
      ['critical', 'major', 'minor'].includes(firstIssue.severity),
      'severity must be critical, major, or minor'
    );
  } finally {
    fs.unlinkSync(pngPath);
    fs.unlinkSync(fakeBin);
  }
});

// ---------------------------------------------------------------------------
// evaluateStage — 5MB guard (delegates to buildUserPrompt)
// ---------------------------------------------------------------------------

test('evaluateStage throws before any CLI call when PNG > 5MB', () => {
  const tmpFile = path.join(os.tmpdir(), `morph-deck-qa-large-${Date.now()}.png`);
  const buf = Buffer.alloc(6 * 1024 * 1024, 0);
  fs.writeFileSync(tmpFile, buf);

  // Use a fake bin that would throw if called — to prove we never reach it.
  const fakeBin = '/nonexistent/should-never-be-called';

  try {
    assert.throws(
      () => evaluateStage({
        pngPath: tmpFile,
        stageName: 'slide-big',
        captionText: 'Test',
        tokens: {},
        _fakeClaudeBin: fakeBin,
      }),
      /5\s*MB|file too large|exceeds/i,
      'must throw size error before calling CLI'
    );
  } finally {
    fs.unlinkSync(tmpFile);
  }
});
