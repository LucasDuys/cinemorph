/**
 * fps_monitor.mjs — Monitor frame rate during WebGL playback.
 *
 * Injects a requestAnimationFrame counter into the page context
 * that tracks actual FPS and warns if it drops below a threshold.
 *
 * Provides:
 *   - attachFpsMonitor(page, options): inject counter, start polling
 *     Returns { stop, getStats } handles.
 */

/**
 * attachFpsMonitor({ page, warnThreshold = 24, sampleIntervalMs = 500 })
 *
 * Injects a __morphDeck_fps global into the page that tracks actual frame delivery.
 * Polls page.evaluate() every sampleIntervalMs and logs a warning to stderr if
 * fps < warnThreshold for two consecutive samples.
 *
 * Returns: { stop(), getStats() }
 *   - stop(): clear the polling interval
 *   - getStats(): return { currentFps, sampleCount, warningsFired }
 */
export async function attachFpsMonitor(
  page,
  { warnThreshold = 24, sampleIntervalMs = 500 } = {}
) {
  // Inject the rAF counter script into the page context
  await page.addInitScript(() => {
    // Define the global FPS tracker
    window.__morphDeck_fps = {
      frameCount: 0,
      lastSampleTime: Date.now(),
      lastSampleCount: 0,
      currentFps: 0,
    };

    // Use requestAnimationFrame to count frames
    function countFrame() {
      window.__morphDeck_fps.frameCount += 1;
      requestAnimationFrame(countFrame);
    }

    countFrame();
  });

  // Poll the FPS value every sampleIntervalMs
  const stats = {
    currentFps: 0,
    sampleCount: 0,
    warningsFired: 0,
    consecutiveLowSamples: 0,
  };

  const pollInterval = setInterval(async () => {
    try {
      const fpsData = await page.evaluate(() => {
        const now = Date.now();
        const elapsed = now - window.__morphDeck_fps.lastSampleTime;
        const framesSinceLastSample =
          window.__morphDeck_fps.frameCount - window.__morphDeck_fps.lastSampleCount;

        const fps = elapsed > 0
          ? Math.round((framesSinceLastSample / elapsed) * 1000)
          : 0;

        // Update for next sample
        window.__morphDeck_fps.lastSampleTime = now;
        window.__morphDeck_fps.lastSampleCount = window.__morphDeck_fps.frameCount;
        window.__morphDeck_fps.currentFps = fps;

        return { fps, frameCount: window.__morphDeck_fps.frameCount };
      });

      stats.currentFps = fpsData.fps;
      stats.sampleCount += 1;

      // Track consecutive low samples
      if (fpsData.fps < warnThreshold) {
        stats.consecutiveLowSamples += 1;

        // Warn on second consecutive low sample
        if (stats.consecutiveLowSamples === 2) {
          const msg = `WARNING: 3D scene fps dropped to ${fpsData.fps}fps. Consider reducing 3D point count or switching to --3d-mode static for this export.`;
          process.stderr.write(msg + "\n");
          stats.warningsFired += 1;
        }
      } else {
        stats.consecutiveLowSamples = 0;
      }
    } catch (e) {
      // Silently ignore eval errors (page might be closing)
    }
  }, sampleIntervalMs);

  return {
    stop() {
      clearInterval(pollInterval);
    },
    getStats() {
      return { ...stats };
    },
  };
}
