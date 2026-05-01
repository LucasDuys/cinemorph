// T014: palette-extractor.cjs — STUB IMPLEMENTATION.
//
// Extracts a 5-color palette from a reference image, mapping to the token
// roles { background, foreground, surfaceRaised, mutedForeground, accent }.
//
// IMPORTANT: This is a deterministic STUB. It does NOT decode the actual
// pixel data of the image (decoding PNG/JPG/WEBP without dependencies is
// non-trivial). Instead, it hashes the file contents and derives 5 hex
// colors from the hash. The output is stable for a given input file but is
// NOT a real palette extraction.
//
// TODO(T014-followup): replace stub with real palette extraction.
// Options: (a) add `sharp` + `extract-colors` deps and decode pixels, or
// (b) call a vision LLM (Claude w/ image input) to extract dominant colors.
// The spec (R009) allows the implementer to choose; this stub keeps T014
// scoped while letting the merger layer wire end-to-end.

'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap per spec

const ROLES = ['background', 'foreground', 'surfaceRaised', 'mutedForeground', 'accent'];

function extractPalette(imagePath) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`palette-extractor: file not found: ${imagePath}`);
  }
  const stat = fs.statSync(imagePath);
  if (stat.size > MAX_BYTES) {
    throw new Error(`palette-extractor: image too large (${stat.size} bytes > ${MAX_BYTES} byte cap)`);
  }
  const buf = fs.readFileSync(imagePath);
  // Deterministic hash → 5 hex colors. Each role gets 6 hex chars sliced
  // from a SHA-256 of (file bytes + role name) so different roles diverge.
  const palette = {};
  for (const role of ROLES) {
    const h = crypto.createHash('sha256').update(buf).update(role).digest('hex');
    palette[role] = '#' + h.slice(0, 6).toUpperCase();
  }
  return palette;
}

module.exports = { extractPalette, ROLES, MAX_BYTES };
