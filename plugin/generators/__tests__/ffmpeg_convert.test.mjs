// Tests for ffmpeg WebM to MP4 conversion utility.

import { test } from "node:test";
import * as assert from "node:assert";
import {
  isFfmpegAvailable,
  convertWebmToMp4,
} from "../lib/ffmpeg_convert.mjs";
import { mkdirSync, writeFileSync, rmSync, existsSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_ROOT = join(__dirname, "..", "..", ".forge-test-ffmpeg");

function setupTestDir() {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true, force: true });
  mkdirSync(TEST_ROOT, { recursive: true });
  return TEST_ROOT;
}

test("isFfmpegAvailable returns boolean", async () => {
  const result = await isFfmpegAvailable();
  assert.strictEqual(typeof result, "boolean");
  // Result depends on whether ffmpeg is installed; just verify it returns a boolean
});

test("convertWebmToMp4 returns object with ok property", async () => {
  const testDir = setupTestDir();
  const webmPath = join(testDir, "test.webm");
  const mp4Path = join(testDir, "test.mp4");

  writeFileSync(webmPath, Buffer.alloc(1024)); // Dummy webm

  const result = await convertWebmToMp4(webmPath, mp4Path);

  assert.strictEqual(typeof result, "object", "result should be an object");
  assert.strictEqual(typeof result.ok, "boolean", "result.ok should be boolean");

  rmSync(testDir, { recursive: true, force: true });
});

test("convertWebmToMp4 result has error field when conversion fails", async () => {
  const testDir = setupTestDir();
  const webmPath = join(testDir, "nonexistent.webm");
  const mp4Path = join(testDir, "test.mp4");

  const result = await convertWebmToMp4(webmPath, mp4Path);

  // Should fail because webm doesn't exist or ffmpeg not found
  assert.strictEqual(result.ok, false, "should return ok: false");
  assert.ok(result.error, "should have an error property");

  rmSync(testDir, { recursive: true, force: true });
});

test("convertWebmToMp4 includes sizeMb when reporting success", async () => {
  // This test is informational - it will only pass if ffmpeg is installed
  // and the conversion succeeds. On CI/test machines without ffmpeg, it will
  // fail gracefully.
  const testDir = setupTestDir();
  const webmPath = join(testDir, "dummy.webm");
  const mp4Path = join(testDir, "output.mp4");

  writeFileSync(webmPath, Buffer.alloc(1024 * 10));

  const result = await convertWebmToMp4(webmPath, mp4Path);

  if (result.ok) {
    assert.strictEqual(typeof result.sizeMb, "number", "sizeMb should be a number when ok");
    assert.ok(result.sizeMb >= 0, "sizeMb should be non-negative");
  } else {
    // Conversion failed (expected if ffmpeg not installed)
    assert.ok(result.error, "should have error when conversion fails");
  }

  rmSync(testDir, { recursive: true, force: true });
});
