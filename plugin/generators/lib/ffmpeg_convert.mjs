// Converts WebM video to MP4 using ffmpeg.
// Handles missing ffmpeg, codec configuration, file cleanup, and size reporting.

import { spawn } from "node:child_process";
import { statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Check if ffmpeg is available in the system PATH.
 * @returns {Promise<boolean>} true if ffmpeg is available, false otherwise
 */
export async function isFfmpegAvailable() {
  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", ["-version"]);
    let exited = false;

    ffmpeg.on("exit", (code) => {
      exited = true;
      resolve(code === 0);
    });

    ffmpeg.on("error", (err) => {
      if (!exited && err.code === "ENOENT") {
        exited = true;
        resolve(false);
      }
    });

    // Timeout after 5 seconds just in case
    setTimeout(() => {
      if (!exited) {
        exited = true;
        ffmpeg.kill();
        resolve(false);
      }
    }, 5000);
  });
}

/**
 * Convert WebM video to MP4 using ffmpeg with libx264 codec.
 * Mirrors the ffmpeg invocation from record_deck.mjs.
 *
 * @param {string} webmPath - path to input WebM file
 * @param {string} mp4Path - path to output MP4 file
 * @param {Object} options - conversion options
 * @param {boolean} [options.keepWebm=false] - keep WebM after conversion
 * @param {string} [options.codec='libx264'] - video codec (default: libx264)
 * @param {number} [options.crf=18] - quality (0-51, lower=better, default: 18)
 * @returns {Promise<{ok: boolean, mp4Path?: string, webmPath?: string, error?: string, sizeMb?: number}>}
 */
export async function convertWebmToMp4(
  webmPath,
  mp4Path,
  { keepWebm = false, codec = "libx264", crf = 18 } = {}
) {
  // Verify ffmpeg is available
  const available = await isFfmpegAvailable();
  if (!available) {
    return { ok: false, error: "ffmpeg-not-found" };
  }

  const absWebmPath = resolve(webmPath);
  const absMp4Path = resolve(mp4Path);

  return new Promise((resolve) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y", // Overwrite output file
      "-i",
      absWebmPath,
      "-c:v",
      codec,
      "-preset",
      "slow",
      "-crf",
      String(crf),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      absMp4Path,
    ]);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("exit", (code) => {
      if (code !== 0) {
        return resolve({
          ok: false,
          error: `ffmpeg exited with code ${code}: ${stderr}`,
        });
      }

      try {
        // Get MP4 file size
        const stats = statSync(absMp4Path);
        const sizeMb = stats.size / (1024 * 1024);

        // Optionally delete WebM
        if (!keepWebm) {
          try {
            unlinkSync(absWebmPath);
          } catch (e) {
            // If we can't delete, still consider conversion successful
          }
        }

        resolve({
          ok: true,
          mp4Path: absMp4Path,
          webmPath: keepWebm ? absWebmPath : undefined,
          sizeMb: parseFloat(sizeMb.toFixed(2)),
        });
      } catch (e) {
        resolve({
          ok: false,
          error: `failed to stat mp4: ${e.message}`,
        });
      }
    });

    ffmpeg.on("error", (err) => {
      resolve({
        ok: false,
        error: err.message || String(err),
      });
    });
  });
}
