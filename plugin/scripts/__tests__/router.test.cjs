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

test('top-level --help lists all 9 subcommands and exits 0', () => {
  const r = run(['--help']);
  assert.equal(r.status, 0, 'exit code: ' + r.status + ' stderr: ' + r.stderr);
  const out = r.stdout;
  for (const sub of ['new', 'iterate', 'render', 'pptx', 'video', 'export', 'qa', 'compare', 'reference']) {
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

test('--help qa shows qa-specific flags and the stub message', () => {
  const r = run(['qa', '--help']);
  assert.equal(r.status, 0, 'exit code: ' + r.status);
  const out = r.stdout;
  assert.ok(out.includes('--no-qa'), 'qa help missing --no-qa flag\n' + out);
  assert.ok(out.includes('--main-only'), 'qa help missing --main-only flag\n' + out);
  assert.ok(out.includes('--deck'), 'qa help missing --deck flag\n' + out);
  assert.ok(out.includes('not yet implemented'), 'qa help missing stub message\n' + out);
});

test('--help compare shows compare-specific flags and the stub message', () => {
  const r = run(['compare', '--help']);
  assert.equal(r.status, 0, 'exit code: ' + r.status);
  const out = r.stdout;
  assert.ok(out.includes('--against'), 'compare help missing --against flag\n' + out);
  assert.ok(out.includes('--auto-improve'), 'compare help missing --auto-improve flag\n' + out);
  assert.ok(out.includes('--deck'), 'compare help missing --deck flag\n' + out);
  assert.ok(out.includes('not yet implemented'), 'compare help missing stub message\n' + out);
});

test('--help reference shows reference sub-actions and the stub message', () => {
  const r = run(['reference', '--help']);
  assert.equal(r.status, 0, 'exit code: ' + r.status);
  const out = r.stdout;
  assert.ok(out.includes('add'), 'reference help missing add sub-action\n' + out);
  assert.ok(out.includes('list'), 'reference help missing list sub-action\n' + out);
  assert.ok(out.includes('not yet implemented'), 'reference help missing stub message\n' + out);
});

test('--no-qa flag is parsed as a boolean', () => {
  const r = run(
    ['qa', '--deck', './my-deck', '--no-qa'],
    { MORPH_DECK_DEBUG_FLAGS: '1' },
  );
  assert.equal(r.status, 0, 'exit code: ' + r.status + ' stderr: ' + r.stderr);
  const parsed = JSON.parse(r.stdout.trim());
  assert.equal(parsed.subcommand, 'qa');
  assert.equal(parsed.flags['no-qa'], true, 'no-qa should be true\n' + JSON.stringify(parsed.flags));
  assert.equal(parsed.flags.deck, './my-deck');
});
