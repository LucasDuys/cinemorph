// T017: diff-applier.cjs — applies a JSON patch to deck source files.
//
// Usage:
//   const { applyPatch } = require('./diff-applier.cjs');
//   const applied = await applyPatch({ deckPath, patch });
//
// Patch shape:
//   {
//     files: {
//       'src/deck/stages.ts': { mode: 'replace', content: '...' },
//       'src/deck/data.ts':   { mode: 'diff', hunks: [{ before: '...', after: '...' }] },
//     }
//   }
//
// Returns: string[] — list of absolute paths of files that were written.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Count non-overlapping occurrences of `needle` in `haystack`.
 * @param {string} haystack
 * @param {string} needle
 * @returns {number}
 */
function countOccurrences(haystack, needle) {
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

/**
 * Apply a single hunk (find-and-replace) to content.
 * Throws a clear error if `before` is not found, or is found more than once.
 * @param {string} content
 * @param {{ before: string, after: string }} hunk
 * @param {string} filePath - for error messages only
 * @returns {string}
 */
function applyHunk(content, hunk, filePath) {
  const { before, after } = hunk;
  const occurrences = countOccurrences(content, before);
  if (occurrences === 0) {
    throw new Error(
      `diff-applier: hunk 'before' not found in ${filePath}.\n` +
      `Expected to find:\n${before.slice(0, 200)}`
    );
  }
  if (occurrences > 1) {
    throw new Error(
      `diff-applier: hunk 'before' is not unique in ${filePath} (found ${occurrences} times).\n` +
      `To avoid ambiguity, provide a longer 'before' context.\n` +
      `Matched:\n${before.slice(0, 200)}`
    );
  }
  return content.replace(before, after);
}

/**
 * Apply a patch object to a deck's source files.
 *
 * @param {object} params
 * @param {string} params.deckPath - Absolute path to the deck root directory.
 * @param {object} params.patch    - Patch descriptor (see module header for shape).
 * @returns {string[]} Absolute paths of all files that were written.
 */
function applyPatch({ deckPath, patch }) {
  if (!patch || !patch.files || Object.keys(patch.files).length === 0) {
    return [];
  }

  const applied = [];

  for (const [relPath, descriptor] of Object.entries(patch.files)) {
    const absPath = path.resolve(deckPath, relPath);

    if (descriptor.mode === 'replace') {
      // Write full content as-is, creating parent dirs if needed.
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, descriptor.content ?? '', 'utf8');
      applied.push(absPath);
    } else if (descriptor.mode === 'diff') {
      // Read existing content and apply each hunk sequentially.
      let content;
      try {
        content = fs.readFileSync(absPath, 'utf8');
      } catch (err) {
        throw new Error(
          `diff-applier: cannot read file for diff mode: ${absPath}\n${err.message}`
        );
      }

      const hunks = descriptor.hunks ?? [];
      for (const hunk of hunks) {
        content = applyHunk(content, hunk, absPath);
      }

      fs.writeFileSync(absPath, content, 'utf8');
      applied.push(absPath);
    } else {
      throw new Error(
        `diff-applier: unknown mode '${descriptor.mode}' for file ${relPath}. ` +
        `Expected 'replace' or 'diff'.`
      );
    }
  }

  return applied;
}

module.exports = { applyPatch };
