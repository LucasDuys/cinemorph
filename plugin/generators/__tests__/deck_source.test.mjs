/**
 * deck_source.test.mjs — tests for deck_source module
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { readDeckSource, DeckSource } from "../lib/deck_source.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMP_DIR = path.join(__dirname, ".test-tmp");

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function cleanupTempDir() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

test("JSON sidecar happy path", () => {
  ensureTempDir();
  const deckPath = path.join(TEMP_DIR, "test-deck-json");
  fs.mkdirSync(path.join(deckPath, "src", "deck"), { recursive: true });

  // Write JSON sidecars
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "stages.json"),
    JSON.stringify([
      { id: "stage1", title: "Hero" },
      { id: "stage2", title: "Problem" },
    ])
  );
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "data.json"),
    JSON.stringify({ title: "My Deck", author: "Test User" })
  );
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "tokens.json"),
    JSON.stringify({ colorPrimary: "#0066FF" })
  );
  fs.writeFileSync(
    path.join(deckPath, "package.json"),
    JSON.stringify({ name: "test-deck" })
  );

  const deck = readDeckSource(deckPath);

  assert.equal(deck.name, "test-deck");
  assert.equal(deck.stages.length, 2);
  assert.equal(deck.stages[0].id, "stage1");
  assert.equal(deck.data.title, "My Deck");
  assert.equal(deck.tokens.colorPrimary, "#0066FF");

  cleanupTempDir();
});

test("TypeScript regex fallback path", () => {
  ensureTempDir();
  const deckPath = path.join(TEMP_DIR, "test-deck-ts");
  fs.mkdirSync(path.join(deckPath, "src", "deck"), { recursive: true });

  // Write TypeScript files instead of JSON
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "stages.ts"),
    `
export const STAGES = [
  { id: "stage1", title: "Hero" },
  { id: "stage2", title: "Problem" },
];
`
  );
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "data.ts"),
    `
export const DATA = {
  title: "My TS Deck",
  author: "Test User",
};
`
  );
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "tokens.ts"),
    `
export const TOKENS = {
  colorPrimary: "#FF0066",
};
`
  );
  fs.writeFileSync(
    path.join(deckPath, "package.json"),
    JSON.stringify({ name: "test-ts-deck" })
  );

  const deck = readDeckSource(deckPath);

  assert.equal(deck.name, "test-ts-deck");
  assert.equal(deck.stages.length, 2);
  assert.equal(deck.stages[0].id, "stage1");
  assert.equal(deck.data.title, "My TS Deck");
  assert.equal(deck.tokens.colorPrimary, "#FF0066");

  cleanupTempDir();
});

test("Missing stages.json/ts throws error", () => {
  ensureTempDir();
  const deckPath = path.join(TEMP_DIR, "test-deck-missing");
  fs.mkdirSync(path.join(deckPath, "src", "deck"), { recursive: true });

  // No stages file at all
  fs.writeFileSync(path.join(deckPath, "package.json"), JSON.stringify({}));

  assert.throws(
    () => readDeckSource(deckPath),
    /missing stages source/
  );

  cleanupTempDir();
});

test("JSON sidecar with wrapped array (STAGES key)", () => {
  ensureTempDir();
  const deckPath = path.join(TEMP_DIR, "test-deck-wrapped");
  fs.mkdirSync(path.join(deckPath, "src", "deck"), { recursive: true });

  // JSON wrapped in object with key
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "stages.json"),
    JSON.stringify({
      STAGES: [
        { id: "s1", title: "First" },
        { id: "s2", title: "Second" },
      ],
    })
  );
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "data.json"),
    JSON.stringify({})
  );
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "tokens.json"),
    JSON.stringify({})
  );
  fs.writeFileSync(
    path.join(deckPath, "package.json"),
    JSON.stringify({ name: "wrapped-deck" })
  );

  const deck = readDeckSource(deckPath);

  assert.equal(deck.stages.length, 2);
  assert.equal(deck.stages[0].id, "s1");

  cleanupTempDir();
});

test("TypeScript with comments and trailing commas", () => {
  ensureTempDir();
  const deckPath = path.join(TEMP_DIR, "test-deck-comments");
  fs.mkdirSync(path.join(deckPath, "src", "deck"), { recursive: true });

  // TypeScript with comments and trailing commas
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "stages.ts"),
    `
// This is a comment
export const STAGES = [
  { id: "stage1", title: "Hero", }, // trailing comma
  { id: "stage2", title: "Problem" },
];
/* block comment */
`
  );
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "data.json"),
    JSON.stringify({})
  );
  fs.writeFileSync(
    path.join(deckPath, "src", "deck", "tokens.json"),
    JSON.stringify({})
  );
  fs.writeFileSync(
    path.join(deckPath, "package.json"),
    JSON.stringify({ name: "comments-deck" })
  );

  const deck = readDeckSource(deckPath);

  assert.equal(deck.stages.length, 2);
  assert.equal(deck.stages[0].id, "stage1");

  cleanupTempDir();
});
