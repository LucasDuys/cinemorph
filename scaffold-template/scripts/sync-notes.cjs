/**
 * Talk-track sync script: generates notes.md from stages and syncs edits back.
 * Forward: writes stages -> notes.md
 * Reverse: detects notes.md edits, syncs script field back into stages
 */

const fs = require('fs');
const path = require('path');

/**
 * Count words in a string (simple split on whitespace).
 */
function wordCount(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Compute dwell time: (wordCount / 150) + 1.5, ceil'd
 */
function computeDwell(text) {
  const wc = wordCount(text);
  return Math.ceil((wc / 150) + 1.5);
}

/**
 * Generate notes.md from stages array.
 * One section per stage with eyebrow, headline, dwell, cues, and script.
 */
function generateNotes(stages) {
  let markdown = '# Presentation Notes\n\n';

  for (const stage of stages) {
    const backup = stage.backup ? ' [BACKUP]' : '';
    markdown += `## Stage ${stage.id}: ${stage.name}${backup}\n`;

    if (stage.caption?.eyebrow) {
      markdown += `**Eyebrow:** ${stage.caption.eyebrow}\n`;
    }
    if (stage.caption?.headline) {
      markdown += `**Headline:** ${stage.caption.headline}\n`;
    }

    if (stage.talkTrack?.script) {
      const script = stage.talkTrack.script;
      const dwell = stage.talkTrack.dwellSeconds ?? computeDwell(script);
      markdown += `**Dwell:** ${dwell}s\n`;
    }

    if (stage.talkTrack?.cues && stage.talkTrack.cues.length > 0) {
      markdown += `**Cues:** ${stage.talkTrack.cues.join(', ')}\n`;
    }

    if (stage.talkTrack?.script) {
      markdown += `\n${stage.talkTrack.script}\n`;
    }

    markdown += '\n';
  }

  return markdown;
}

/**
 * Extract script from a stage section in notes.md.
 * Assumes format:
 * ## Stage N: Name
 * **Eyebrow:** ...
 * **Headline:** ...
 * **Dwell:** Xs
 * **Cues:** ...
 *
 * <script text here>
 */
function extractScriptFromSection(sectionText) {
  // Split by double newline to separate header/meta from script
  const parts = sectionText.split('\n\n');
  if (parts.length < 2) return '';

  // Join all parts after the first (which contains headers and metadata)
  const scriptPart = parts.slice(1).join('\n\n').trim();
  return scriptPart;
}

/**
 * Parse notes.md content and sync script fields back into stages array.
 * Other fields (eyebrow, headline, cues, dwell) are read-only in notes.md.
 */
function syncFromNotes(stages, notesContent) {
  // Parse sections from markdown
  const sectionRegex = /^## Stage (\d+):/m;
  const sections = notesContent.split(/(?=^## Stage \d+:)/m).filter(s => s.trim());

  for (const section of sections) {
    const match = section.match(sectionRegex);
    if (!match) continue;

    const stageId = parseInt(match[1], 10);
    const stage = stages.find(s => s.id === stageId);
    if (!stage) continue;

    const script = extractScriptFromSection(section);
    if (script) {
      if (!stage.talkTrack) {
        stage.talkTrack = {};
      }
      stage.talkTrack.script = script;
    }
  }

  return stages;
}

/**
 * Main CLI entry point.
 * Usage:
 *   node sync-notes.cjs generate <stagesPath> <outPath>
 *   node sync-notes.cjs sync <stagesPath> <notesPath> <outPath>
 */
async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd === 'generate') {
    const stagesPath = args[0] || './src/deck/stages.ts';
    const outPath = args[1] || './notes.md';

    try {
      const stagesModule = require(path.resolve(stagesPath));
      const stages = stagesModule.STAGES || [];
      const markdown = generateNotes(stages);
      fs.writeFileSync(outPath, markdown, 'utf8');
      console.log(`Generated notes at ${outPath}`);
    } catch (e) {
      console.error(`Error generating notes: ${e.message}`);
      process.exit(1);
    }
  } else if (cmd === 'sync') {
    const stagesPath = args[0] || './src/deck/stages.ts';
    const notesPath = args[1] || './notes.md';
    const outPath = args[2] || stagesPath;

    try {
      const notesContent = fs.readFileSync(notesPath, 'utf8');
      const stagesModule = require(path.resolve(stagesPath));
      const stages = JSON.parse(JSON.stringify(stagesModule.STAGES || [])); // Deep copy
      const updated = syncFromNotes(stages, notesContent);

      // Simple TypeScript emission (minimal)
      const tsContent = `export const STAGES = ${JSON.stringify(updated, null, 2)};`;
      fs.writeFileSync(outPath, tsContent, 'utf8');
      console.log(`Synced notes back to ${outPath}`);
    } catch (e) {
      console.error(`Error syncing notes: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log('Usage: node sync-notes.cjs <generate|sync> [args]');
    console.log('  generate <stagesPath> <outPath>');
    console.log('  sync <stagesPath> <notesPath> <outPath>');
    process.exit(1);
  }
}

module.exports = { generateNotes, syncFromNotes, computeDwell, wordCount };

if (require.main === module) {
  main();
}
