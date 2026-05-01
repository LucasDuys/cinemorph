// dist_dir.mjs — manage <deck>/dist/ for the video recorder + notes.md exports.
// Spec: R012 (output dir hygiene). Mirrors the Python helper API.
import { mkdir, rm, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

export async function ensureDist(deckPath, { clean = false } = {}) {
  const dist = join(deckPath, 'dist');
  if (clean) {
    await rm(dist, { recursive: true, force: true });
  }
  await mkdir(dist, { recursive: true });
  return dist;
}

export async function ensureGitignore(deckPath) {
  const gi = join(deckPath, '.gitignore');
  const needed = 'dist/';
  let existing = '';
  try {
    existing = await readFile(gi, 'utf8');
  } catch { /* doesn't exist yet */ }
  const lines = existing.split(/\r?\n/);
  if (lines.includes(needed)) return;
  const updated = (existing && !existing.endsWith('\n') ? existing + '\n' : existing) + needed + '\n';
  await writeFile(gi, updated, 'utf8');
}

export async function artifactPath(deckPath, name) {
  await ensureDist(deckPath);
  return join(deckPath, 'dist', name);
}
