/**
 * dwell.mjs — Auto-pace dwell calculations from talk-track + override flags.
 *
 * Provides:
 *   - wordCount(text): count words by whitespace
 *   - defaultDwellSeconds(stage): estimate from word count (150 wpm baseline + 1.5s buffer)
 *   - resolveDwell(stage, overrides): apply precedence (per-stage override > stage.dwellSeconds > default)
 *   - MORPH_SETTLE_MS: 800ms — minimum settle after morph completes
 *   - TAIL_MS: 1200ms — extra buffer at end of last stage
 */

/**
 * wordCount(text: string): number
 * Split on whitespace and filter empty strings.
 */
export function wordCount(text) {
  if (!text) return 0;
  return text
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .length;
}

/**
 * defaultDwellSeconds(stage: object): number
 * Estimate dwell from talk-track script: (wordCount / 150) + 1.5.
 * Floor: 1.5s, Ceiling: 30s.
 * ~150 wpm presenter pace.
 */
export function defaultDwellSeconds(stage) {
  const script = stage?.talkTrack?.script ?? "";
  const words = wordCount(script);
  const estimated = (words / 150) + 1.5;

  // Floor at 1.5s, ceiling at 30s
  return Math.max(1.5, Math.min(30, estimated));
}

/**
 * resolveDwell(stage: object, overrides: object): number
 * Precedence: overrides.dwellByStageId[stage.id] > stage.dwellSeconds > defaultDwellSeconds(stage)
 * Returns dwell time in seconds.
 */
export function resolveDwell(stage, overrides = {}) {
  const stageId = stage?.id;

  // Check per-stage override first
  if (overrides?.dwellByStageId && stageId && overrides.dwellByStageId[stageId] !== undefined) {
    return overrides.dwellByStageId[stageId];
  }

  // Check stage.dwellSeconds
  if (stage?.dwellSeconds !== undefined && stage.dwellSeconds !== null) {
    return stage.dwellSeconds;
  }

  // Fall back to default calculation
  return defaultDwellSeconds(stage);
}

/**
 * MORPH_SETTLE_MS: 800
 * Minimum settle time (ms) after the morph completes before advancing to next stage.
 * Accounts for CSS transitions and layout stabilization.
 */
export const MORPH_SETTLE_MS = 800;

/**
 * TAIL_MS: 1200
 * Extra buffer (ms) at the end of the last stage before closing the browser.
 * Allows the final frame to fully render and stabilize.
 */
export const TAIL_MS = 1200;
