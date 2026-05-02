/**
 * notes_md.mjs — standalone talk-track notes.md export.
 *
 * Spec: spec-morph-deck-outputs.md R011 (Talk-track standalone notes.md export).
 *
 * Exports:
 *   - exportNotesMd({ deckPath, outPath }): read deck, write notes.md, return metadata
 *
 * Format per stage:
 *   ## Stage N: <name> (~Xs dwell)
 *   **[BACKUP]** (if isBackup)
 *   **Eyebrow:** ...
 *   **Headline:** ...
 *
 *   <talkTrack.script>
 *
 *   **Cues:**
 *   - cue 1
 *   - cue 2
 */

import fs from "fs";
import path from "path";
import { readDeckSource } from "./deck_source.mjs";
import { ensureDist, artifactPath } from "./dist_dir.mjs";

/**
 * Export talk-track notes to standalone Markdown.
 *
 * @param {Object} opts
 * @param {string} opts.deckPath - path to deck directory
 * @param {string} [opts.outPath] - output file path (default: <deck>/dist/notes.md)
 * @returns {Object} { outPath, stageCount, backupCount }
 * @throws {Error} if stages list is empty or deck source missing
 */
export async function exportNotesMd({ deckPath, outPath = null }) {
  const deckSource = readDeckSource(deckPath);

  if (!deckSource.stages || deckSource.stages.length === 0) {
    throw new Error("stages list is empty");
  }

  // Resolve output path
  const resolvedOutPath =
    outPath || (await artifactPath(deckPath, "notes.md"));

  // Ensure dist dir exists
  await ensureDist(deckPath);

  // Build markdown
  const md = buildNotesMd(deckSource.name, deckSource.stages);

  // Write file
  await fs.promises.writeFile(resolvedOutPath, md, "utf8");

  // Count backups
  const backupCount = deckSource.stages.filter((s) => s.isBackup).length;

  return {
    outPath: resolvedOutPath,
    stageCount: deckSource.stages.length,
    backupCount,
  };
}

/**
 * Build markdown content from deck name and stages.
 *
 * @private
 */
function buildNotesMd(deckName, stages) {
  const lines = [];

  // Title
  lines.push(`# ${deckName}`);
  lines.push("");

  // Per-stage section
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const stageNum = i + 1;

    // Stage heading: "## Stage N: <name> (~Xs dwell)"
    const dwell = stage.talkTrack?.dwellSeconds
      ? ` (~${Math.round(stage.talkTrack.dwellSeconds)}s dwell)`
      : "";
    lines.push(`## Stage ${stageNum}: ${stage.name}${dwell}`);

    // BACKUP marker
    if (stage.isBackup) {
      lines.push("**[BACKUP]**");
    }

    // Caption fields
    if (stage.caption) {
      if (stage.caption.eyebrow) {
        lines.push(`**Eyebrow:** ${stage.caption.eyebrow}`);
      }
      if (stage.caption.headline) {
        lines.push(`**Headline:** ${stage.caption.headline}`);
      }
    }

    // Script
    if (stage.talkTrack?.script) {
      lines.push("");
      lines.push(stage.talkTrack.script);
    }

    // Cues
    if (stage.talkTrack?.cues && Array.isArray(stage.talkTrack.cues)) {
      if (stage.talkTrack.cues.length > 0) {
        lines.push("");
        lines.push("**Cues:**");
        for (const cue of stage.talkTrack.cues) {
          lines.push(`- ${cue}`);
        }
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}
