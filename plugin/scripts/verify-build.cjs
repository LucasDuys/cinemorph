// T016: verify-build.cjs — run bun build (or tsc fallback) against a deck.
//
// Usage:
//   const { verifyBuild } = require('./verify-build.cjs');
//   const result = verifyBuild(deckPath);
//
// Returns:
//   { ok: true }
//   { ok: false, errors: string }   — full stderr on failure

'use strict';

const cp = require('node:child_process');

/**
 * Run `bun run build` in deckPath and return the outcome.
 * Falls back to `tsc --noEmit` when bun is not found (ENOENT).
 *
 * @param {string} deckPath - Absolute path to the deck directory.
 * @returns {{ ok: true } | { ok: false, errors: string }}
 */
function verifyBuild(deckPath) {
  let result = _spawnBuild('bun', ['run', 'build'], deckPath);

  // ENOENT means bun binary not found — fall back to tsc.
  if (result === 'ENOENT') {
    result = _spawnBuild('tsc', ['--noEmit'], deckPath);
    // If tsc also not found, surface a clear message.
    if (result === 'ENOENT') {
      return { ok: false, errors: 'verify-build: neither bun nor tsc found on PATH' };
    }
  }

  return result;
}

/**
 * Internal: spawn a single build command.
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} cwd
 * @returns {{ ok: true } | { ok: false, errors: string } | 'ENOENT'}
 */
function _spawnBuild(cmd, args, cwd) {
  let spawnResult;
  try {
    spawnResult = cp.spawnSync(cmd, args, {
      cwd,
      encoding: 'utf8',
      timeout: 120_000,       // 2-minute hard limit
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    if (err.code === 'ENOENT') return 'ENOENT';
    return { ok: false, errors: `verify-build: spawn error: ${err.message}` };
  }

  // spawnSync sets `error` field on ENOENT without throwing in some node versions.
  if (spawnResult.error) {
    if (spawnResult.error.code === 'ENOENT') return 'ENOENT';
    return { ok: false, errors: `verify-build: spawn error: ${spawnResult.error.message}` };
  }

  if (spawnResult.status === 0) {
    return { ok: true };
  }

  const errors = (spawnResult.stderr || '') || (spawnResult.stdout || '') || `${cmd} exited ${spawnResult.status}`;
  return { ok: false, errors };
}

module.exports = { verifyBuild };
