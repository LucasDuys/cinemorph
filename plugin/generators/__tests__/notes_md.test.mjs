/**
 * notes_md.test.mjs — Unit tests for standalone notes.md export.
 *
 * Uses node:test framework.
 * Tests: required headings, per-stage sections, BACKUP marker, dwell rounding,
 * cues as bullets, empty stages error, file write.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { exportNotesMd } from "../lib/notes_md.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Create a minimal deck structure in a temp directory.
 */
async function scaffoldDeck(stages = []) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "notes-md-test-"));
  const deckPath = path.join(tmpDir, "test-deck");
  const srcDeck = path.join(deckPath, "src", "deck");

  await fs.mkdir(srcDeck, { recursive: true });
  await fs.writeFile(
    path.join(deckPath, "package.json"),
    JSON.stringify({ name: "test-deck" }),
    "utf8"
  );
  await fs.writeFile(
    path.join(srcDeck, "stages.json"),
    JSON.stringify(stages),
    "utf8"
  );

  return { tmpDir, deckPath };
}

/**
 * Clean up temp directory.
 */
async function cleanup(tmpDir) {
  await fs.rm(tmpDir, { recursive: true, force: true });
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

test("exportNotesMd: emits Markdown with required headings", async (t) => {
  const { tmpDir, deckPath } = await scaffoldDeck([
    {
      id: 1,
      name: "Opening",
      caption: { eyebrow: "Welcome", headline: "Hello World" },
      talkTrack: { script: "This is the opening slide." },
      elements: {},
    },
  ]);

  try {
    const result = await exportNotesMd({ deckPath });
    assert.ok(result.outPath);

    const content = await fs.readFile(result.outPath, "utf8");
    assert.match(content, /# test-deck/, "title heading present");
    assert.match(content, /## Stage 1: Opening/, "stage heading present");
    assert.match(content, /\*\*Eyebrow:\*\* Welcome/, "eyebrow present");
    assert.match(content, /\*\*Headline:\*\* Hello World/, "headline present");
  } finally {
    await cleanup(tmpDir);
  }
});

test("exportNotesMd: BACKUP marker on isBackup stages", async (t) => {
  const { tmpDir, deckPath } = await scaffoldDeck([
    {
      id: 1,
      name: "Main",
      caption: { eyebrow: "", headline: "Main" },
      talkTrack: { script: "Main slide" },
      elements: {},
    },
    {
      id: 2,
      name: "Backup",
      caption: { eyebrow: "", headline: "Backup" },
      talkTrack: { script: "Backup slide" },
      isBackup: true,
      elements: {},
    },
  ]);

  try {
    const result = await exportNotesMd({ deckPath });
    const content = await fs.readFile(result.outPath, "utf8");

    // Main stage should not have BACKUP marker
    const mainSection = content.match(/## Stage 1:[\s\S]*?## Stage 2:/)[0];
    assert.doesNotMatch(mainSection, /\*\*\[BACKUP\]\*\*/, "stage 1 no backup");

    // Backup stage should have BACKUP marker
    const backupSection = content.slice(content.indexOf("## Stage 2:"));
    assert.match(backupSection, /\*\*\[BACKUP\]\*\*/, "stage 2 has backup");

    assert.equal(
      result.backupCount,
      1,
      "backupCount reflects one backup stage"
    );
  } finally {
    await cleanup(tmpDir);
  }
});

test("exportNotesMd: dwell shown in seconds (rounded)", async (t) => {
  const { tmpDir, deckPath } = await scaffoldDeck([
    {
      id: 1,
      name: "Slide",
      caption: { eyebrow: "", headline: "Slide" },
      talkTrack: {
        script: "Test",
        dwellSeconds: 2.7,
      },
      elements: {},
    },
  ]);

  try {
    const result = await exportNotesMd({ deckPath });
    const content = await fs.readFile(result.outPath, "utf8");

    assert.match(content, /~3s dwell/, "dwell rounded to nearest second");
  } finally {
    await cleanup(tmpDir);
  }
});

test("exportNotesMd: cues rendered as bullets", async (t) => {
  const { tmpDir, deckPath } = await scaffoldDeck([
    {
      id: 1,
      name: "Cued",
      caption: { eyebrow: "", headline: "Cued" },
      talkTrack: {
        script: "Script with cues",
        cues: ["Look at the chart", "Emphasize growth"],
      },
      elements: {},
    },
  ]);

  try {
    const result = await exportNotesMd({ deckPath });
    const content = await fs.readFile(result.outPath, "utf8");

    assert.match(content, /\*\*Cues:\*\*/, "cues header present");
    assert.match(content, /- Look at the chart/, "cue 1 as bullet");
    assert.match(content, /- Emphasize growth/, "cue 2 as bullet");
  } finally {
    await cleanup(tmpDir);
  }
});

test("exportNotesMd: empty stages list throws clear error", async (t) => {
  const { tmpDir, deckPath } = await scaffoldDeck([]);

  try {
    await assert.rejects(
      () => exportNotesMd({ deckPath }),
      (err) => err.message.includes("empty"),
      "throws error mentioning empty"
    );
  } finally {
    await cleanup(tmpDir);
  }
});

test("exportNotesMd: file written to outPath with non-empty content", async (t) => {
  const { tmpDir, deckPath } = await scaffoldDeck([
    {
      id: 1,
      name: "Test",
      caption: { eyebrow: "", headline: "Test" },
      talkTrack: { script: "Test script" },
      elements: {},
    },
  ]);

  try {
    const customOut = path.join(deckPath, "custom-notes.md");
    const result = await exportNotesMd({ deckPath, outPath: customOut });

    assert.equal(result.outPath, customOut, "outPath matches input");

    const exists = await fs
      .access(customOut)
      .then(() => true)
      .catch(() => false);
    assert.ok(exists, "file exists at custom path");

    const content = await fs.readFile(customOut, "utf8");
    assert.ok(content.length > 0, "file has non-empty content");
  } finally {
    await cleanup(tmpDir);
  }
});
