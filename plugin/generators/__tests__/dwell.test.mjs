/**
 * dwell.test.mjs — Unit tests for dwell calculation functions.
 *
 * Uses node:test framework.
 * Tests: wordCount, defaultDwellSeconds, resolveDwell, override precedence, floor/ceiling.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  wordCount,
  defaultDwellSeconds,
  resolveDwell,
  MORPH_SETTLE_MS,
  TAIL_MS,
} from "../lib/dwell.mjs";

// ─────────────────────────────────────────────────────────────────────
// wordCount tests
// ─────────────────────────────────────────────────────────────────────

test("wordCount: empty string returns 0", () => {
  assert.equal(wordCount(""), 0);
});

test("wordCount: null/undefined returns 0", () => {
  assert.equal(wordCount(null), 0);
  assert.equal(wordCount(undefined), 0);
});

test("wordCount: single word", () => {
  assert.equal(wordCount("hello"), 1);
});

test("wordCount: multiple words separated by single space", () => {
  assert.equal(wordCount("hello world test"), 3);
});

test("wordCount: multiple spaces treated as single separator", () => {
  assert.equal(wordCount("hello   world"), 2);
});

test("wordCount: tabs and newlines as whitespace", () => {
  assert.equal(wordCount("hello\tworld\ntest"), 3);
});

test("wordCount: punctuation attached to words counts as part of word", () => {
  assert.equal(wordCount("hello, world! test."), 3);
});

test("wordCount: leading and trailing whitespace ignored", () => {
  assert.equal(wordCount("  hello world  "), 2);
});

// ─────────────────────────────────────────────────────────────────────
// defaultDwellSeconds tests
// ─────────────────────────────────────────────────────────────────────

test("defaultDwellSeconds: empty stage script floors at 1.5s", () => {
  const result = defaultDwellSeconds({ talkTrack: { script: "" } });
  assert.equal(result, 1.5);
});

test("defaultDwellSeconds: no talkTrack floors at 1.5s", () => {
  const result = defaultDwellSeconds({});
  assert.equal(result, 1.5);
});

test("defaultDwellSeconds: stage with 150 words ≈ 2.5s", () => {
  // 150 words / 150 wpm = 1s + 1.5s buffer = 2.5s
  const words = "word ".repeat(150).trim();
  const result = defaultDwellSeconds({ talkTrack: { script: words } });
  assert.equal(result, 2.5);
});

test("defaultDwellSeconds: stage with 300 words ≈ 3.5s", () => {
  // 300 words / 150 wpm = 2s + 1.5s buffer = 3.5s
  const words = "word ".repeat(300).trim();
  const result = defaultDwellSeconds({ talkTrack: { script: words } });
  assert.equal(result, 3.5);
});

test("defaultDwellSeconds: very long script ceils at 30s", () => {
  // 6000 words / 150 = 40s + 1.5s = 41.5s → clamped to 30s
  const words = "word ".repeat(6000).trim();
  const result = defaultDwellSeconds({ talkTrack: { script: words } });
  assert.equal(result, 30);
});

// ─────────────────────────────────────────────────────────────────────
// resolveDwell tests (precedence: override > dwellSeconds > default)
// ─────────────────────────────────────────────────────────────────────

test("resolveDwell: no overrides, no dwellSeconds uses default", () => {
  const stage = { talkTrack: { script: "word ".repeat(150).trim() } };
  const result = resolveDwell(stage, {});
  assert.equal(result, 2.5);
});

test("resolveDwell: stage.dwellSeconds takes precedence over default", () => {
  const stage = {
    id: "stage-1",
    dwellSeconds: 5.0,
    talkTrack: { script: "word ".repeat(300).trim() }, // would default to 3.5s
  };
  const result = resolveDwell(stage, {});
  assert.equal(result, 5.0);
});

test("resolveDwell: override per-stage ID takes highest precedence", () => {
  const stage = {
    id: "stage-1",
    dwellSeconds: 5.0, // would use this
    talkTrack: { script: "word ".repeat(150).trim() },
  };
  const overrides = {
    dwellByStageId: { "stage-1": 10.0 }, // but override wins
  };
  const result = resolveDwell(stage, overrides);
  assert.equal(result, 10.0);
});

test("resolveDwell: override for one stage doesn't affect another", () => {
  const stage1 = { id: "stage-1", talkTrack: { script: "" } };
  const stage2 = { id: "stage-2", talkTrack: { script: "" } };

  const overrides = {
    dwellByStageId: { "stage-1": 7.0 },
  };

  assert.equal(resolveDwell(stage1, overrides), 7.0);
  assert.equal(resolveDwell(stage2, overrides), 1.5); // default
});

test("resolveDwell: null/missing dwellSeconds falls back to default", () => {
  const stage = {
    id: "stage-1",
    dwellSeconds: null,
    talkTrack: { script: "word ".repeat(150).trim() },
  };
  const result = resolveDwell(stage, {});
  assert.equal(result, 2.5);
});

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

test("MORPH_SETTLE_MS is 800", () => {
  assert.equal(MORPH_SETTLE_MS, 800);
});

test("TAIL_MS is 1200", () => {
  assert.equal(TAIL_MS, 1200);
});
