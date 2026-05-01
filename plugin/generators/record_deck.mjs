/**
 * record_deck.mjs — Records a running pitch deck to WebM via Playwright.
 *
 * Workflow:
 *   1. If --dev: spawn `bun run dev` at <deck>/. Otherwise assume dist/ is built.
 *   2. Start vite preview on port 4173 (or next available).
 *   3. Launch Chromium at 1920x1080 with recordVideo enabled.
 *   4. Navigate, wait for fonts to settle, then ArrowRight through stages
 *      dwelling per stages.json dwellSeconds (fallback: (wordCount/150) + 1.5).
 *   5. Close browser, find .webm file, return its path.
 *
 * Usage:
 *   node record_deck.mjs <deck-path> [--dev]
 *
 * Output: WebM file path printed to stdout.
 */

import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { readDeckSource } from "./lib/deck_source.mjs";

const VIEWPORT = { width: 1920, height: 1080 };
const MORPH_SETTLE = 1100; // wait after each ArrowRight for 0.7s morph
const FONT_SETTLE = 1200; // wait for fonts to load

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`server at ${url} did not respond within ${maxMs}ms`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { deck: null, dev: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dev") {
      opts.dev = true;
    } else if (args[i] === "--deck" && i + 1 < args.length) {
      opts.deck = args[i + 1];
      i++;
    } else if (!opts.deck && !args[i].startsWith("--")) {
      opts.deck = args[i];
    }
  }

  return opts;
}

function calculateDwell(stage, tokens) {
  if (stage.dwellSeconds !== undefined && stage.dwellSeconds !== null) {
    return Math.round(stage.dwellSeconds * 1000);
  }

  // Fallback: estimate from word count
  const wordCount = stage.wordCount || 0;
  const estimatedSeconds = (wordCount / 150) + 1.5;
  return Math.round(estimatedSeconds * 1000);
}

async function main() {
  const opts = parseArgs();

  if (!opts.deck) {
    console.error("Usage: node record_deck.mjs <deck-path> [--dev]");
    process.exit(1);
  }

  const deckPath = resolve(opts.deck);
  const outDir = join(deckPath, "dist", "recordings");
  const previewUrl = "http://localhost:4173";

  try {
    // ── Step 0: Read deck source ────────────────────────────────────────
    console.log("[0/5] reading deck source…");
    let stages, data, tokens;
    try {
      const deckSource = readDeckSource(deckPath);
      stages = deckSource.stages;
      data = deckSource.data;
      tokens = deckSource.tokens;
    } catch (e) {
      console.warn(`could not read deck_source: ${e.message}; continuing with empty defaults`);
      stages = [];
      data = {};
      tokens = {};
    }

    // ── Step 1: Build (or ensure dist exists) ───────────────────────────
    if (opts.dev) {
      console.log("[1/5] building with bun run dev…");
      const build = spawnSync("bun", ["run", "dev"], {
        cwd: deckPath,
        stdio: "inherit",
        shell: true,
      });
      if (build.status !== 0) {
        throw new Error("bun run dev failed");
      }
    } else {
      // Assume dist/ is already built. If not, try building anyway.
      const distPath = join(deckPath, "dist");
      if (!existsSync(distPath)) {
        console.log("[1/5] dist/ not found; attempting bun run build…");
        const build = spawnSync("bun", ["run", "build"], {
          cwd: deckPath,
          stdio: "inherit",
          shell: true,
        });
        if (build.status !== 0) {
          throw new Error("bun run build failed");
        }
      } else {
        console.log("[1/5] dist/ found, skipping build");
      }
    }

    // ── Step 2: Start preview server ────────────────────────────────────
    console.log("[2/5] starting vite preview on :4173…");
    const server = spawn("bun", ["run", "preview"], {
      cwd: deckPath,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (d) => process.stdout.write(`[preview] ${d}`));
    server.stderr.on("data", (d) => process.stderr.write(`[preview] ${d}`));

    try {
      await waitForServer(previewUrl);

      // ── Step 3: Launch chromium with recordVideo ────────────────────
      console.log("[3/5] launching chromium…");
      mkdirSync(outDir, { recursive: true });

      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
        recordVideo: { dir: outDir, size: VIEWPORT },
      });
      const page = await context.newPage();
      await page.goto(previewUrl, { waitUntil: "networkidle" });

      // Wait for fonts to load
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await sleep(FONT_SETTLE);

      // ── Step 4: Step through stages ────────────────────────────────
      console.log("[4/5] stepping through stages…");

      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const dwell = calculateDwell(stage, tokens);

        if (i > 0) {
          console.log(`  pressing ArrowRight to stage ${i}…`);
          await page.keyboard.press("ArrowRight");
          await sleep(MORPH_SETTLE);
        }

        console.log(`  dwelling on stage ${i} for ${dwell}ms…`);
        await sleep(dwell);
      }

      // Final trail at end
      await sleep(1500);

      await page.close();
      await context.close();
      await browser.close();

      console.log("[4/5] recording complete");
    } finally {
      server.kill("SIGTERM");
    }

    // ── Step 5: Find and return WebM path ──────────────────────────────
    console.log("[5/5] locating webm file…");
    const webmFiles = readdirSync(outDir).filter((f) => f.endsWith(".webm"));
    if (webmFiles.length === 0) {
      throw new Error("no webm file produced");
    }

    const webmPath = join(outDir, webmFiles[0]);
    console.log(`success: ${webmPath}`);
    process.stdout.write(webmPath);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}

main();
