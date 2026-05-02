/**
 * recorder.mjs — Recording session orchestrator.
 *
 * Provides:
 *   - recordSession({ deckPath, page, stages, overrides }): loop through stages,
 *     press ArrowRight, await dwell + morph settle, return .webm path.
 *     Caller is record_deck.mjs (T003) — refactor later to delegate.
 *   - detectHas3D(stages): scan for element3d: true flag in any stage
 *   - getWebGLLaunchOptions(has3d): return launch config for WebGL canvas capture
 */

import { resolveDwell, MORPH_SETTLE_MS, TAIL_MS } from "./dwell.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * detectHas3D(stages): boolean
 * Scan the stages array for any stage with element3d: true.
 * Returns true if at least one 3D element is present.
 */
export function detectHas3D(stages = []) {
  return stages.some((stage) => stage?.element3d === true);
}

/**
 * getWebGLLaunchOptions(has3d): object
 * Return Playwright launch options for recording.
 * When has3d is true:
 *   - Remove --disable-gpu flag (breaks WebGL rendering)
 *   - Use headless: false with --window-position=-32000,-32000 (headed off-screen pattern)
 *     This allows Playwright to capture the WebGL canvas in the video output.
 * When has3d is false:
 *   - Use standard headless mode with --disable-gpu for safety.
 */
export function getWebGLLaunchOptions(has3d = false) {
  if (has3d) {
    // Headed off-screen: allows WebGL canvas capture
    return {
      headless: false,
      args: [
        "--window-position=-32000,-32000", // Place window off-screen
      ],
    };
  }

  // Standard headless mode for non-3D decks (Phase 1 behavior)
  return {
    headless: true,
    args: [
      "--disable-gpu", // Safe for 2D-only rendering
    ],
  };
}

/**
 * recordSession({ deckPath, page, stages, overrides = {} }): Promise<string>
 *
 * Orchestrates the recording loop:
 *   1. For each stage, press ArrowRight (except stage 0)
 *   2. Wait MORPH_SETTLE_MS for morph to complete
 *   3. Calculate dwell from resolveDwell(stage, overrides)
 *   4. Wait dwell time
 *   5. After last stage, add TAIL_MS buffer
 *   6. Return the path to the produced .webm file
 *
 * Args:
 *   - deckPath (string): path to the deck directory (unused for now, for future refactoring)
 *   - page (object): Playwright page instance with keyboard + video recording
 *   - stages (array): list of stage objects, each with optional id, dwellSeconds, talkTrack.script
 *   - overrides (object, optional): { dwellByStageId: { stageId: dwellSeconds, ... } }
 *
 * Returns:
 *   - Promise<string>: path to the .webm file produced by Playwright's recordVideo
 *
 * Notes:
 *   - This is a helper for record_deck.mjs. The caller is responsible for:
 *     * Spawning the preview server
 *     * Creating the browser context with recordVideo enabled
 *     * Calling page.goto() and waiting for fonts
 *     * Closing the browser and finding the .webm file
 *   - Future refactoring (T003): move entire orchestration here.
 */
export async function recordSession({
  deckPath,
  page,
  stages,
  overrides = {},
}) {
  console.log(`[recorder] stepping through ${stages.length} stages…`);

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    // Press ArrowRight to advance (skip on first stage)
    if (i > 0) {
      console.log(`  [${i}] pressing ArrowRight…`);
      await page.keyboard.press("ArrowRight");
      await sleep(MORPH_SETTLE_MS);
    }

    // Resolve dwell time with overrides precedence
    const dwellSeconds = resolveDwell(stage, overrides);
    const dwellMs = Math.round(dwellSeconds * 1000);

    console.log(`  [${i}] dwelling for ${dwellMs}ms (${dwellSeconds.toFixed(2)}s)…`);
    await sleep(dwellMs);
  }

  // Add tail buffer at end
  console.log(`[recorder] adding tail buffer (${TAIL_MS}ms)…`);
  await sleep(TAIL_MS);

  console.log("[recorder] session complete");

  // Return null for now — caller finds .webm file directly.
  // Future: could return the path here if we give recordSession access to file discovery.
  return null;
}
