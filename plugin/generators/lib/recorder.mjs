/**
 * recorder.mjs — Recording session orchestrator.
 *
 * Provides:
 *   - recordSession({ deckPath, page, stages, overrides }): loop through stages,
 *     press ArrowRight, await dwell + morph settle, return .webm path.
 *     Caller is record_deck.mjs (T003) — refactor later to delegate.
 */

import { resolveDwell, MORPH_SETTLE_MS, TAIL_MS } from "./dwell.mjs";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
