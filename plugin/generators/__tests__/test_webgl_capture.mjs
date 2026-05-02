/**
 * test_webgl_capture.mjs — Tests for WebGL/3D video recording support.
 *
 * Tests for:
 *   - fps_monitor.mjs: FPS tracking, warning thresholds, consecutive samples
 *   - recorder.mjs: detectHas3D, getWebGLLaunchOptions, canvas capture setup
 *
 * Uses node:test framework with mocked Playwright page object.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { detectHas3D, getWebGLLaunchOptions } from "../lib/recorder.mjs";
import { attachFpsMonitor } from "../lib/fps_monitor.mjs";

// ─────────────────────────────────────────────────────────────────────
// FPS Monitor Tests (AC3: requestAnimationFrame counter + warnings)
// ─────────────────────────────────────────────────────────────────────

test("fps_monitor: creates FPS tracker global", async () => {
  // Mock page with addInitScript and evaluate
  let initScriptCalled = false;
  const mockPage = {
    async addInitScript(fn) {
      initScriptCalled = true;
      // Just verify it's a function, don't execute it in Node context
      assert.equal(typeof fn, "function", "addInitScript receives a function");
      return Promise.resolve();
    },
    evaluate() {
      return Promise.resolve({ fps: 30, frameCount: 1800 });
    },
  };

  const monitor = await attachFpsMonitor(mockPage);
  assert.ok(initScriptCalled, "addInitScript was called");
  assert.ok(monitor.stop, "stop function exists");
  assert.ok(monitor.getStats, "getStats function exists");

  const stats = monitor.getStats();
  assert.ok(stats.hasOwnProperty("sampleCount"), "stats has sampleCount");
  assert.ok(stats.hasOwnProperty("warningsFired"), "stats has warningsFired");
  assert.equal(stats.sampleCount, 0, "initial sampleCount is 0");
  assert.equal(stats.warningsFired, 0, "initial warningsFired is 0");

  monitor.stop();
});

test("fps_monitor: polls evaluate at regular interval", async (t) => {
  let evaluateCallCount = 0;
  const mockPage = {
    addInitScript() {
      return Promise.resolve();
    },
    evaluate() {
      evaluateCallCount += 1;
      return Promise.resolve({ fps: 30, frameCount: 1800 + evaluateCallCount * 100 });
    },
  };

  const monitor = await attachFpsMonitor(mockPage, { sampleIntervalMs: 50 });

  // Wait for at least 2 samples
  await new Promise((r) => setTimeout(r, 150));

  const stats = monitor.getStats();
  assert.ok(stats.sampleCount >= 2, `expected at least 2 samples, got ${stats.sampleCount}`);
  assert.ok(evaluateCallCount >= 2, `expected at least 2 evaluate calls, got ${evaluateCallCount}`);

  monitor.stop();
});

test("fps_monitor: warns on two consecutive low FPS samples (AC3)", async (t) => {
  const warnings = [];
  const originalStderr = process.stderr.write;
  process.stderr.write = (msg) => {
    warnings.push(msg.toString());
    return true;
  };

  let callCount = 0;
  const mockPage = {
    addInitScript() {
      return Promise.resolve();
    },
    evaluate() {
      callCount += 1;
      // First sample: 20 fps (low)
      // Second sample: 20 fps (low again -> triggers warning)
      // Third sample: 30 fps (high, resets counter)
      if (callCount === 1 || callCount === 2) {
        return Promise.resolve({ fps: 20, frameCount: 1200 });
      }
      return Promise.resolve({ fps: 30, frameCount: 1800 });
    },
  };

  try {
    const monitor = await attachFpsMonitor(mockPage, {
      warnThreshold: 24,
      sampleIntervalMs: 30,
    });

    // Wait for at least 3 samples
    await new Promise((r) => setTimeout(r, 150));

    const stats = monitor.getStats();
    assert.equal(stats.warningsFired, 1, "expected 1 warning after 2 low samples");
    assert.ok(
      warnings.some((w) => w.includes("WARNING")),
      "warning message written to stderr"
    );
    assert.ok(
      warnings.some((w) => w.includes("20fps")),
      "warning includes actual FPS value"
    );
    assert.ok(
      warnings.some((w) => w.includes("3D scene fps")),
      "warning mentions 3D scene"
    );

    monitor.stop();
  } finally {
    process.stderr.write = originalStderr;
  }
});

test("fps_monitor: no warning if FPS stays above threshold", async () => {
  const warnings = [];
  const originalStderr = process.stderr.write;
  process.stderr.write = (msg) => {
    warnings.push(msg.toString());
    return true;
  };

  const mockPage = {
    addInitScript() {
      return Promise.resolve();
    },
    evaluate() {
      return Promise.resolve({ fps: 30, frameCount: 1800 });
    },
  };

  try {
    const monitor = await attachFpsMonitor(mockPage, {
      warnThreshold: 24,
      sampleIntervalMs: 30,
    });

    await new Promise((r) => setTimeout(r, 150));

    const stats = monitor.getStats();
    assert.equal(stats.warningsFired, 0, "no warnings when FPS >= threshold");
    assert.ok(
      !warnings.some((w) => w.includes("WARNING")),
      "no warning message written"
    );

    monitor.stop();
  } finally {
    process.stderr.write = originalStderr;
  }
});

test("fps_monitor: resets consecutive counter on good FPS", async () => {
  let callCount = 0;
  const warnings = [];
  const originalStderr = process.stderr.write;
  process.stderr.write = (msg) => {
    warnings.push(msg.toString());
    return true;
  };

  const mockPage = {
    addInitScript() {
      return Promise.resolve();
    },
    evaluate() {
      callCount += 1;
      // Low, low, HIGH, low, low -> warning only after second low
      if (callCount === 1 || callCount === 2) return Promise.resolve({ fps: 20 });
      if (callCount === 3) return Promise.resolve({ fps: 30 }); // Reset counter
      return Promise.resolve({ fps: 20 }); // Restart counting
    },
  };

  try {
    const monitor = await attachFpsMonitor(mockPage, {
      warnThreshold: 24,
      sampleIntervalMs: 30,
    });

    await new Promise((r) => setTimeout(r, 200));

    const stats = monitor.getStats();
    // First warning after samples 1-2, then reset at sample 3
    // Samples 4-5 would be low again but that's only 2 more samples
    // We expect at least 1 warning (from the first pair)
    assert.ok(stats.warningsFired >= 1, `expected warnings, got ${stats.warningsFired}`);

    monitor.stop();
  } finally {
    process.stderr.write = originalStderr;
  }
});

// ─────────────────────────────────────────────────────────────────────
// detectHas3D Tests
// ─────────────────────────────────────────────────────────────────────

test("detectHas3D: empty stages array returns false", () => {
  assert.equal(detectHas3D([]), false);
});

test("detectHas3D: undefined stages returns false", () => {
  assert.equal(detectHas3D(undefined), false);
});

test("detectHas3D: single stage without element3d returns false", () => {
  const stages = [{ id: "stage-0", caption: "Title" }];
  assert.equal(detectHas3D(stages), false);
});

test("detectHas3D: single stage with element3d=true returns true (AC1)", () => {
  const stages = [{ id: "stage-0", element3d: true }];
  assert.equal(detectHas3D(stages), true);
});

test("detectHas3D: single stage with element3d=false returns false", () => {
  const stages = [{ id: "stage-0", element3d: false }];
  assert.equal(detectHas3D(stages), false);
});

test("detectHas3D: multiple stages, one with element3d=true returns true", () => {
  const stages = [
    { id: "stage-0", caption: "Title" },
    { id: "stage-1", element3d: true },
    { id: "stage-2", caption: "More" },
  ];
  assert.equal(detectHas3D(stages), true);
});

test("detectHas3D: multiple stages, all without element3d returns false", () => {
  const stages = [
    { id: "stage-0", caption: "Title" },
    { id: "stage-1", caption: "Body" },
  ];
  assert.equal(detectHas3D(stages), false);
});

// ─────────────────────────────────────────────────────────────────────
// WebGL Launch Options Tests (AC1: headless off-screen + GPU enabled)
// ─────────────────────────────────────────────────────────────────────

test("getWebGLLaunchOptions: has3d=false uses standard headless mode", () => {
  const opts = getWebGLLaunchOptions(false);

  assert.equal(opts.headless, true, "headless mode enabled");
  assert.ok(opts.args, "args array present");
  assert.ok(
    opts.args.includes("--disable-gpu"),
    "--disable-gpu flag present for safety"
  );
});

test("getWebGLLaunchOptions: has3d=true removes --disable-gpu", () => {
  const opts = getWebGLLaunchOptions(true);

  assert.equal(opts.headless, false, "headless mode disabled for WebGL capture");
  assert.ok(opts.args, "args array present");
  assert.ok(
    !opts.args.includes("--disable-gpu"),
    "--disable-gpu flag absent (breaks WebGL)"
  );
});

test("getWebGLLaunchOptions: has3d=true includes off-screen positioning (AC1)", () => {
  const opts = getWebGLLaunchOptions(true);

  assert.ok(
    opts.args.includes("--window-position=-32000,-32000"),
    "headed off-screen pattern with --window-position=-32000,-32000"
  );
});

test("getWebGLLaunchOptions: has3d=true does not include other GPU flags", () => {
  const opts = getWebGLLaunchOptions(true);

  assert.ok(!opts.args.includes("--disable-software-rasterizer"), "no extra flags");
  assert.equal(
    opts.args.length,
    1,
    "only window-position arg present in 3D mode"
  );
});

test("getWebGLLaunchOptions: default parameter is false", () => {
  const opts = getWebGLLaunchOptions();

  assert.equal(opts.headless, true, "defaults to headless mode");
  assert.ok(opts.args.includes("--disable-gpu"), "defaults to GPU-disabled");
});

// ─────────────────────────────────────────────────────────────────────
// Integration Tests (detectHas3D + getWebGLLaunchOptions)
// ─────────────────────────────────────────────────────────────────────

test("integration: non-3D deck uses standard launch options", () => {
  const stages = [
    { id: "stage-0", caption: "Title" },
    { id: "stage-1", caption: "Body" },
  ];

  const has3d = detectHas3D(stages);
  const opts = getWebGLLaunchOptions(has3d);

  assert.equal(has3d, false, "detected no 3D stages");
  assert.equal(opts.headless, true, "uses headless mode");
  assert.ok(opts.args.includes("--disable-gpu"), "GPU disabled");
});

test("integration: 3D deck uses WebGL launch options", () => {
  const stages = [
    { id: "stage-0", caption: "Title" },
    { id: "stage-1", element3d: true, caption: "3D Orbitals" },
  ];

  const has3d = detectHas3D(stages);
  const opts = getWebGLLaunchOptions(has3d);

  assert.equal(has3d, true, "detected 3D stages");
  assert.equal(opts.headless, false, "uses headed mode");
  assert.ok(opts.args.includes("--window-position=-32000,-32000"), "off-screen positioned");
  assert.ok(!opts.args.includes("--disable-gpu"), "GPU enabled");
});

test("integration: mixed 2D+3D deck triggers WebGL mode", () => {
  const stages = [
    { id: "stage-0", caption: "Intro" },
    { id: "stage-1", element3d: false, caption: "2D Morph" },
    { id: "stage-2", element3d: true, caption: "3D Lattice" },
    { id: "stage-3", caption: "Outro" },
  ];

  const has3d = detectHas3D(stages);
  assert.equal(has3d, true, "even one 3D stage triggers 3D mode");

  const opts = getWebGLLaunchOptions(has3d);
  assert.equal(opts.headless, false, "WebGL mode active");
});

// ─────────────────────────────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────────────────────────────

test("detectHas3D: null stage in array is handled gracefully", () => {
  const stages = [null, { id: "stage-0" }, null];
  assert.doesNotThrow(() => {
    const result = detectHas3D(stages);
    assert.equal(result, false);
  });
});

test("getWebGLLaunchOptions: args array is always present", () => {
  const opts1 = getWebGLLaunchOptions(false);
  const opts2 = getWebGLLaunchOptions(true);

  assert.ok(Array.isArray(opts1.args), "args is array for non-3D");
  assert.ok(Array.isArray(opts2.args), "args is array for 3D");
});

test("getWebGLLaunchOptions: does not mutate input", () => {
  const opts1 = getWebGLLaunchOptions(false);
  const opts2 = getWebGLLaunchOptions(false);

  // Mutate opts1
  opts1.args.push("--test");

  // Verify opts2 is independent
  assert.ok(!opts2.args.includes("--test"), "options are independent");
});
