/**
 * export_all.test.mjs — Unit tests for combined export orchestrator.
 *
 * Tests:
 *   - All three pipelines succeed → exitCode 0
 *   - One pipeline fails → exitCode 1, results show failed
 *   - --skip pptx → results.pptx === 'skipped', others run
 *   - All skipped → exitCode 2
 *   - Status table is printed to stdout
 *
 * Uses mock injection for _pptxFn, _videoFn, _notesFn.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { exportAll } from "../export_all.mjs";

/**
 * Capture stdout during a test.
 * @private
 */
function captureStdout(fn) {
  const original = console.log;
  const lines = [];

  console.log = (...args) => {
    lines.push(args.join(" "));
  };

  try {
    return { lines, result: fn() };
  } finally {
    console.log = original;
  }
}

/**
 * Capture stdout during an async function.
 * @private
 */
async function captureStdoutAsync(fn) {
  const original = console.log;
  const lines = [];

  console.log = (...args) => {
    lines.push(args.join(" "));
  };

  try {
    const result = await fn();
    return { lines, result };
  } finally {
    console.log = original;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: All three pipelines succeed → exitCode 0
// ─────────────────────────────────────────────────────────────────────────────

test("all three pipelines succeed → exitCode 0", async () => {
  const mocks = {
    _pptxFn: async () => ({ ok: true }),
    _videoFn: async () => ({ ok: true }),
    _notesFn: async () => ({ ok: true }),
  };

  const { lines, result } = await captureStdoutAsync(async () =>
    exportAll({
      deckPath: "/fake/deck",
      ...mocks,
    })
  );

  assert.equal(result.exitCode, 0, "exit code should be 0");
  assert.equal(result.results.pptx, "ok", "pptx should be ok");
  assert.equal(result.results.video, "ok", "video should be ok");
  assert.equal(result.results.notes, "ok", "notes should be ok");

  // Verify status table was printed
  const output = lines.join("\n");
  assert.ok(output.includes("=== Export Summary ==="), "should print summary");
  assert.ok(output.includes("pptx: ok"), "should show pptx ok");
  assert.ok(output.includes("video: ok"), "should show video ok");
  assert.ok(output.includes("notes: ok"), "should show notes ok");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: One pipeline fails → exitCode 1
// ─────────────────────────────────────────────────────────────────────────────

test("one pipeline fails → exitCode 1, results show failed", async () => {
  const mocks = {
    _pptxFn: async () => ({ ok: true }),
    _videoFn: async () => ({
      ok: false,
      error: "chromium not found",
    }),
    _notesFn: async () => ({ ok: true }),
  };

  const { lines, result } = await captureStdoutAsync(async () =>
    exportAll({
      deckPath: "/fake/deck",
      ...mocks,
    })
  );

  assert.equal(result.exitCode, 1, "exit code should be 1");
  assert.equal(result.results.pptx, "ok", "pptx should be ok");
  assert.equal(result.results.video, "failed", "video should be failed");
  assert.equal(result.results.notes, "ok", "notes should be ok");

  // Verify status table shows failure
  const output = lines.join("\n");
  assert.ok(output.includes("video: FAILED"), "should show video FAILED");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: --skip pptx → results.pptx === 'skipped', others run
// ─────────────────────────────────────────────────────────────────────────────

test("--skip pptx → pptx skipped, video and notes run", async () => {
  const mocks = {
    _pptxFn: async () => {
      throw new Error("pptx should not be called");
    },
    _videoFn: async () => ({ ok: true }),
    _notesFn: async () => ({ ok: true }),
  };

  const { lines, result } = await captureStdoutAsync(async () =>
    exportAll({
      deckPath: "/fake/deck",
      skip: ["pptx"],
      ...mocks,
    })
  );

  assert.equal(result.results.pptx, "skipped", "pptx should be skipped");
  assert.equal(result.results.video, "ok", "video should be ok");
  assert.equal(result.results.notes, "ok", "notes should be ok");
  assert.equal(result.exitCode, 0, "exit code should be 0");

  const output = lines.join("\n");
  assert.ok(output.includes("pptx: skipped"), "should show pptx skipped");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: All skipped → exitCode 2
// ─────────────────────────────────────────────────────────────────────────────

test("all pipelines skipped → exitCode 2", async () => {
  const mocks = {
    _pptxFn: async () => {
      throw new Error("should not be called");
    },
    _videoFn: async () => {
      throw new Error("should not be called");
    },
    _notesFn: async () => {
      throw new Error("should not be called");
    },
  };

  const { lines, result } = await captureStdoutAsync(async () =>
    exportAll({
      deckPath: "/fake/deck",
      skip: ["pptx", "video", "notes"],
      ...mocks,
    })
  );

  assert.equal(result.exitCode, 2, "exit code should be 2 when all skipped");
  assert.equal(result.results.pptx, "skipped");
  assert.equal(result.results.video, "skipped");
  assert.equal(result.results.notes, "skipped");

  const output = lines.join("\n");
  assert.ok(output.includes("=== Export Summary ==="), "should still print summary");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Status table is printed with ok/failed/skipped
// ─────────────────────────────────────────────────────────────────────────────

test("status table is printed with mixed results", async () => {
  const mocks = {
    _pptxFn: async () => ({ ok: true }),
    _videoFn: async () => ({
      ok: false,
      error: "recording failed",
    }),
    _notesFn: async () => ({ ok: true }),
  };

  const { lines, result } = await captureStdoutAsync(async () =>
    exportAll({
      deckPath: "/fake/deck",
      ...mocks,
    })
  );

  const output = lines.join("\n");

  // Check for summary section
  assert.ok(output.includes("=== Export Summary ==="), "should have summary header");

  // Check for individual status lines
  assert.ok(output.match(/pptx:\s*ok/), "should show pptx: ok");
  assert.ok(output.match(/video:\s*FAILED/), "should show video: FAILED in caps");
  assert.ok(output.match(/notes:\s*ok/), "should show notes: ok");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Error message is captured and reported
// ─────────────────────────────────────────────────────────────────────────────

test("error messages are captured in status output", async () => {
  const mocks = {
    _pptxFn: async () => ({
      ok: false,
      error: "pptx generation timeout after 30s",
    }),
    _videoFn: async () => ({ ok: true }),
    _notesFn: async () => ({ ok: true }),
  };

  const { lines, result } = await captureStdoutAsync(async () =>
    exportAll({
      deckPath: "/fake/deck",
      ...mocks,
    })
  );

  assert.equal(result.exitCode, 1, "exit code should be 1 on failure");

  const output = lines.join("\n");
  assert.ok(
    output.includes("pptx generation timeout after 30s"),
    "should include error message in output"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Exception thrown from pipeline is caught and reported
// ─────────────────────────────────────────────────────────────────────────────

test("exception from pipeline is caught and reported as failed", async () => {
  const mocks = {
    _pptxFn: async () => {
      throw new Error("deck source not found");
    },
    _videoFn: async () => ({ ok: true }),
    _notesFn: async () => ({ ok: true }),
  };

  const { lines, result } = await captureStdoutAsync(async () =>
    exportAll({
      deckPath: "/fake/deck",
      ...mocks,
    })
  );

  assert.equal(result.exitCode, 1, "exit code should be 1");
  assert.equal(result.results.pptx, "failed", "pptx should be failed");

  const output = lines.join("\n");
  assert.ok(output.includes("deck source not found"), "should include thrown error");
});
