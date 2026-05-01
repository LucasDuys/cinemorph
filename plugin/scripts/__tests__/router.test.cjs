'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROUTER = path.resolve(__dirname, '..', 'router.cjs');

function run(args, env) {
  const finalEnv = Object.assign({}, process.env, env || {});
  return spawnSync(process.execPath, [ROUTER].concat(args), {
    encoding: 'utf8',
    env: finalEnv,
  });
}

test('top-level --help lists all 6 subcommands and exits 0', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0, 'exit code: ' + r.status + ' stderr: ' + r.stderr);
  const out = r.stdout;
  for (const sub of ['new', 'iterate', 'render', 'pptx', 'video', 'export']) {
    assert.ok(out.includes(sub), 'top help missing subcommand: ' + sub + '\n' + out);
  }
});

test('`new --help` shows common flags and the not-yet-implemented stub', () => {
  const r = run(['new', '--help']);
  assert.equal(r.status, 0);
  const out = r.stdout;
  for (const flag of ['--theme', '--tokens', '--reference', '--prompt']) {
    assert.ok(out.includes(flag), 'sub help missing flag: ' + flag + '\n' + out);
  }
  assert.ok(out.includes('not yet implemented'), 'sub help missing stub message\n' + out);
});

test('unknown subcommand exits 2 with stderr message', () => {
  const r = run(['unknown-thing']);
  assert.equal(r.status, 2, 'exit code: ' + r.status);
  assert.ok(r.stderr.includes('unknown subcommand'), 'stderr: ' + r.stderr);
});

test('flag parsing extracts theme and prompt with debug env var', () => {
  const r = run(
    ['new', '--theme', 'stacklink-dark', '--prompt', 'test'],
    { MORPH_DECK_DEBUG_FLAGS: '1' },
  );
  assert.equal(r.status, 0, 'exit code: ' + r.status + ' stderr: ' + r.stderr);
  const parsed = JSON.parse(r.stdout.trim());
  assert.equal(parsed.subcommand, 'new');
  assert.equal(parsed.flags.theme, 'stacklink-dark');
  assert.equal(parsed.flags.prompt, 'test');
});
