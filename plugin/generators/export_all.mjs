/**
 * export_all.mjs — Combined orchestrator for PPTX, video, and notes exports.
 *
 * Spec: spec-morph-deck-outputs.md R013 (Combined --all orchestrator + --skip filter +
 * partial-failure status report + exit code logic).
 *
 * Pipelines (in order): pptx, video, notes
 * - Each is invoked via existing scaffolds: build_pptx.py subprocess, record_deck.mjs in-process,
 *   notes_md.mjs in-process.
 * - --skip filter: anything in skip list is reported as 'skipped'.
 * - Try/catch per pipeline: log start/end with timestamp, capture error message.
 * - Exit codes: 0 if all enabled pipelines succeeded; 1 if any failed; 2 if all enabled were skipped.
 *
 * Exports:
 *   - exportAll({ deckPath, skip = [], outDir }): async orchestrator
 *
 * Returns: { results: { pptx, video, notes }, exitCode }
 *   - results[key] one of: 'ok', 'failed', 'skipped'
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const PIPELINES = ["pptx", "video", "notes"];

/**
 * Execute all three export pipelines (or subset with --skip).
 *
 * @param {Object} opts
 * @param {string} opts.deckPath - path to deck directory
 * @param {Array<string>} [opts.skip=[]] - list of pipelines to skip: 'pptx', 'video', 'notes'
 * @param {string} [opts.outDir] - output directory (passed to build_pptx.py, others use defaults)
 * @param {Function} [_pptxFn] - mock: function(deckPath, outDir) returning Promise<{ok, error?}>
 * @param {Function} [_videoFn] - mock: function(deckPath) returning Promise<{ok, error?}>
 * @param {Function} [_notesFn] - mock: function(deckPath) returning Promise<{ok, error?}>
 * @returns {Promise<{results: Object, exitCode: number}>}
 *
 * Results object has keys pptx, video, notes with values 'ok', 'failed', or 'skipped'.
 * Exit codes: 0 = all enabled succeeded; 1 = any failed; 2 = all enabled skipped.
 */
export async function exportAll({
  deckPath,
  skip = [],
  outDir = null,
  _pptxFn = null,
  _videoFn = null,
  _notesFn = null,
}) {
  const deckAbsolute = resolve(deckPath);
  const results = { pptx: null, video: null, notes: null };
  let anyFailed = false;
  let anySucceeded = false;

  // Use mocks if provided (for testing), otherwise use real implementations
  const pptxFn = _pptxFn || runPptxPipeline;
  const videoFn = _videoFn || runVideoPipeline;
  const notesFn = _notesFn || runNotesPipeline;

  const fns = {
    pptx: pptxFn,
    video: videoFn,
    notes: notesFn,
  };

  for (const pipeline of PIPELINES) {
    if (skip.includes(pipeline)) {
      results[pipeline] = "skipped";
      continue;
    }

    const start = Date.now();
    try {
      console.log(`[${pipeline}] starting...`);
      const res = await fns[pipeline](deckAbsolute, outDir);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      if (res.ok) {
        results[pipeline] = "ok";
        anySucceeded = true;
        console.log(`[${pipeline}] ok (${elapsed}s)`);
      } else {
        results[pipeline] = "failed";
        anyFailed = true;
        console.log(
          `[${pipeline}] failed (${elapsed}s): ${res.error || "unknown error"}`
        );
      }
    } catch (err) {
      results[pipeline] = "failed";
      anyFailed = true;
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`[${pipeline}] failed (${elapsed}s): ${err.message}`);
    }
  }

  // Print status table
  console.log("");
  console.log("=== Export Summary ===");
  for (const pipeline of PIPELINES) {
    const status = results[pipeline];
    if (status === "ok") {
      console.log(`  ${pipeline}: ok`);
    } else if (status === "failed") {
      console.log(`  ${pipeline}: FAILED`);
    } else if (status === "skipped") {
      console.log(`  ${pipeline}: skipped`);
    }
  }

  // Determine exit code
  let exitCode = 0;
  if (anyFailed) {
    exitCode = 1;
  } else if (!anySucceeded) {
    // all enabled pipelines were skipped
    exitCode = 2;
  }

  return { results, exitCode };
}

/**
 * Run PPTX exporter via build_pptx.py subprocess.
 *
 * @private
 */
async function runPptxPipeline(deckPath, outDir) {
  return new Promise((resolve) => {
    const args = [deckPath];
    if (outDir) {
      args.push("--out-dir", outDir);
    }

    const proc = spawn("node", [
      resolve(deckPath, "..", "generators", "build_pptx.py"),
      ...args,
    ]);

    let stderr = "";
    let stdout = "";

    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true });
      } else {
        resolve({
          ok: false,
          error: `build_pptx.py exited with code ${code}: ${stderr.trim() || stdout.trim()}`,
        });
      }
    });
  });
}

/**
 * Run video recorder via recordDeck in-process.
 *
 * @private
 */
async function runVideoPipeline(deckPath) {
  try {
    const { recordDeck } = await import("./record_deck.mjs");
    const result = await recordDeck({ deckPath });
    return { ok: !!result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Run notes exporter via exportNotesMd in-process.
 *
 * @private
 */
async function runNotesPipeline(deckPath) {
  try {
    const { exportNotesMd } = await import("./lib/notes_md.mjs");
    const result = await exportNotesMd({ deckPath });
    return { ok: !!result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
