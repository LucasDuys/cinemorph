#!/usr/bin/env node
// T001: render-stages.mjs — render all deck stages to PNG via Playwright + Vite
//
// Usage:
//   render-stages.mjs <deckPath> [--main-only] [--port 5173]
//
// Outputs:
//   <deck>/dist/qa/stage-<N>.png (or error PNG if capture failed)

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import net from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT_POLL_INTERVAL_MS = 250;
const PORT_TIMEOUT_MS = 15_000;
const SETTLE_MS = 1500;
const SIGKILL_GRACE_MS = 2_000;
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;

/**
 * Wait until a TCP connection succeeds on host:port or timeoutMs elapses.
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
function waitForPort(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    function attempt() {
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }
      const sock = net.createConnection({ host, port });
      sock.once('connect', () => {
        sock.destroy();
        resolve(true);
      });
      sock.once('error', () => {
        sock.destroy();
        setTimeout(attempt, PORT_POLL_INTERVAL_MS);
      });
    }

    attempt();
  });
}

/**
 * Kill a child process with SIGTERM, then SIGKILL after graceMs if still alive.
 * @param {import('node:child_process').ChildProcess} proc
 * @returns {Promise<void>}
 */
function killProcess(proc) {
  return new Promise((resolve) => {
    if (proc.exitCode !== null || proc.killed) {
      resolve();
      return;
    }
    proc.kill('SIGTERM');
    const timer = setTimeout(() => {
      if (proc.exitCode === null && !proc.killed) {
        proc.kill('SIGKILL');
      }
      resolve();
    }, SIGKILL_GRACE_MS);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Create an error PNG with the failure reason rendered as text.
 * Uses Playwright to render an HTML page and screenshot it.
 * @param {string} reason - The error message to render
 * @param {import('playwright').Browser} browser - Playwright browser instance
 * @returns {Promise<Buffer>}
 */
async function createErrorPng(reason, browser) {
  const page = await browser.newPage();
  page.setViewportSize({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body {
              width: ${VIEWPORT_WIDTH}px;
              height: ${VIEWPORT_HEIGHT}px;
              background: #dc2626;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            .error-box {
              color: #ffffff;
              text-align: center;
              padding: 40px;
              max-width: 90%;
            }
            .error-title {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .error-message {
              font-size: 18px;
              line-height: 1.5;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <div class="error-box">
            <div class="error-title">Render Failed</div>
            <div class="error-message">${reason.replace(/\n/g, '<br>')}</div>
          </div>
        </body>
      </html>
    `;

    await page.setContent(html);
    await page.waitForLoadState('networkidle');

    const buffer = await page.screenshot({ fullPage: false });
    return buffer;
  } finally {
    await page.close();
  }
}

/**
 * Read the built deck's stages array to filter by backup flag.
 * @param {string} deckPath
 * @returns {Promise<any[]>} stages array
 */
async function readDeckStages(deckPath) {
  // Try to read the built stages.js from dist/
  try {
    const stagesPath = join(deckPath, 'dist', 'assets', 'stages-*.js');
    // For simplicity, we'll evaluate the main.js which bundles stages
    const mainJsPath = join(deckPath, 'dist', 'assets');
    const files = await readFile(join(deckPath, 'src', 'deck', 'stages.ts'), 'utf-8');

    // Parse STAGES export from the source (simple regex for now)
    const match = files.match(/export const STAGES[\s:]*=\s*(\[[\s\S]*?\])\s*(?:as|;|$)/);
    if (!match) {
      throw new Error('Could not find STAGES export in stages.ts');
    }

    // Evaluate the array (risky but necessary for complex objects)
    // In practice, this file should be valid JS
    const stagesStr = match[1];
    const stagesCode = `(${stagesStr})`;
    const stages = eval(stagesCode);
    return stages;
  } catch (err) {
    console.warn(`Could not read stages from built deck: ${err.message}`);
    return [];
  }
}

/**
 * Navigate to a stage and wait for morph settle.
 * @param {import('playwright').Page} page
 * @param {number} stageIndex
 * @returns {Promise<void>}
 */
async function navigateToStage(page, stageIndex) {
  // Try custom event first (spec'd for Phase 2)
  await page.evaluate((idx) => {
    const event = new CustomEvent('morph-deck:jump', { detail: { index: idx } });
    window.dispatchEvent(event);
  }, stageIndex);

  // Fallback: direct window API call if available
  await page.evaluate((idx) => {
    if (window.__morphDeck?.jumpTo) {
      window.__morphDeck.jumpTo(idx);
    }
  }, stageIndex);

  // Wait for morph to settle
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * Main render loop.
 * @param {string} deckPath
 * @param {object} opts
 * @param {boolean} [opts.mainOnly=false]
 * @param {number} [opts.port=5173]
 * @param {function} [opts.launchBrowser] - For testing
 * @param {function} [opts.spawnPreview] - For testing
 * @returns {Promise<{ ok: boolean, results: any[], errors: string[] }>}
 */
export async function renderStages(
  deckPath,
  { mainOnly = false, port = 5173, launchBrowser = null, spawnPreview = null } = {}
) {
  const errors = [];
  const results = [];

  // Start Vite preview server (or use mock for testing)
  const previewProc = spawnPreview
    ? spawnPreview()
    : spawn('bun', ['run', 'preview', '--port', String(port)], {
      cwd: deckPath,
      detached: false,
      stdio: 'pipe',
    });

  let browser;
  try {
    // Wait for port to accept connections
    const portReady = await waitForPort('127.0.0.1', port, PORT_TIMEOUT_MS);
    if (!portReady) {
      throw new Error(`dev server did not open port ${port} within ${PORT_TIMEOUT_MS}ms`);
    }

    // Launch headless Chromium via Playwright
    const playwright = await import('playwright');
    browser = launchBrowser
      ? await launchBrowser()
      : await playwright.chromium.launch({ headless: true });

    // Create QA output directory
    const qaDir = join(deckPath, 'dist', 'qa');
    await mkdir(qaDir, { recursive: true });

    // Read stages (or fallback to hardcoded count for testing)
    let stages = [];
    try {
      stages = await readDeckStages(deckPath);
    } catch (_) {
      // Fallback: assume 8 stages (override in tests)
      stages = Array.from({ length: 8 }, (_, i) => ({ id: `stage-${i}`, backup: false }));
    }

    if (stages.length === 0) {
      throw new Error('No stages found in deck');
    }

    // Filter by mainOnly flag
    const stagesToRender = mainOnly ? stages.filter((s) => !s.backup) : stages;

    // Render each stage
    for (let idx = 0; idx < stagesToRender.length; idx++) {
      const stage = stagesToRender[idx];
      const globalIdx = stages.indexOf(stage);
      const outputPath = join(qaDir, `stage-${globalIdx}.png`);

      let page;
      try {
        page = await browser.newPage();
        page.setViewportSize({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

        // Navigate to stage
        await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });
        await navigateToStage(page, globalIdx);

        // Capture screenshot
        await page.screenshot({ path: outputPath, fullPage: false });
        results.push({ index: globalIdx, path: outputPath, ok: true });
      } catch (err) {
        // Render error PNG
        const errorMsg = `Stage ${globalIdx} render failed: ${err.message || String(err)}`;
        try {
          const errorPng = await createErrorPng(errorMsg, browser);
          await new Promise((resolve, reject) => {
            const stream = createWriteStream(outputPath);
            stream.on('finish', resolve);
            stream.on('error', reject);
            stream.write(errorPng);
            stream.end();
          });
        } catch (pngErr) {
          console.warn(`Failed to create error PNG for stage ${globalIdx}: ${pngErr.message}`);
        }

        errors.push(errorMsg);
        results.push({ index: globalIdx, path: outputPath, ok: false, error: err.message });
      } finally {
        if (page) {
          try {
            await page.close();
          } catch (_) {
            // ignore
          }
        }
      }
    }

    await browser.close();
    browser = undefined;

    return { ok: errors.length === 0, results, errors };
  } catch (err) {
    return {
      ok: false,
      results,
      errors: [...errors, err.message || String(err)],
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        // ignore
      }
    }
    await killProcess(previewProc);
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const deckPath = args[0];

  if (!deckPath) {
    console.error('Usage: render-stages.mjs <deckPath> [--main-only] [--port 5173]');
    process.exit(1);
  }

  const mainOnly = args.includes('--main-only');
  const portIdx = args.indexOf('--port');
  const port = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) : 5173;

  renderStages(deckPath, { mainOnly, port })
    .then((result) => {
      if (result.ok) {
        console.log(`Rendered ${result.results.length} stages to ${join(deckPath, 'dist', 'qa')}`);
        process.exit(0);
      } else {
        console.error('Render failed:');
        result.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('Fatal error:', err.message);
      process.exit(1);
    });
}
