// T016: verify-render.cjs — spawn dev server, screenshot with Playwright, collect errors.
//
// Usage:
//   const { verifyRender } = require('./verify-render.cjs');
//   const result = await verifyRender(deckPath, { port: 5173 });
//
// Returns:
//   { ok: true,  screenshot: '<deckPath>/dist/preview-stage-1.png' }
//   { ok: false, errors: string[] }

'use strict';

const cp = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const PORT_POLL_INTERVAL_MS = 250;
const PORT_TIMEOUT_MS = 15_000;
const SETTLE_MS = 1_500;
const SIGKILL_GRACE_MS = 2_000;

/**
 * Wait until a TCP connection succeeds on host:port or timeoutMs elapses.
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<boolean>} true if port opened in time, false otherwise.
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
 * Spawn the deck dev server, navigate with Playwright, capture a screenshot,
 * and collect console/page errors.
 *
 * @param {string} deckPath - Absolute path to the deck directory.
 * @param {object} [opts]
 * @param {number} [opts.port=5173] - Port the dev server listens on.
 * @returns {Promise<{ ok: true, screenshot: string } | { ok: false, errors: string[] }>}
 */
async function verifyRender(deckPath, { port = 5173 } = {}) {
  const consoleErrors = [];

  // Start dev server (background, not detached so it dies with this process).
  const devServer = cp.spawn('bun', ['run', 'dev'], {
    cwd: deckPath,
    detached: false,
    stdio: 'pipe',
  });

  let browser;
  try {
    // Wait for port to accept connections.
    const portReady = await waitForPort('127.0.0.1', port, PORT_TIMEOUT_MS);
    if (!portReady) {
      return { ok: false, errors: [`verify-render: dev server did not open port ${port} within ${PORT_TIMEOUT_MS}ms`] };
    }

    // Launch headless Chromium via Playwright.
    const playwright = require('playwright');
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Collect console errors and page errors.
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message || String(err));
    });

    await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle' });

    // Wait for fonts + settle time.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(SETTLE_MS);

    // Capture screenshot.
    const distDir = path.join(deckPath, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    const screenshotPath = path.join(distDir, 'preview-stage-1.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });

    await browser.close();
    browser = undefined;

    if (consoleErrors.length > 0) {
      return { ok: false, errors: consoleErrors };
    }

    return { ok: true, screenshot: screenshotPath };
  } catch (err) {
    return { ok: false, errors: [err.message || String(err)] };
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) { /* ignore */ }
    }
    await killProcess(devServer);
  }
}

module.exports = { verifyRender };
