// T018: dsl-parser.test.cjs — unit tests for parseDsl and helpers.
// Uses node:test. _promptFn injected to avoid interactive stdin.

'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');

const {
  parseDsl,
  extractStageBlocks,
  buildStageDescriptors,
  renderYamlSummary,
  buildDslDraft,
  parseChangeCommand,
  applyChange,
} = require('../dsl-parser.cjs');

// ---------------------------------------------------------------------------
// extractStageBlocks
// ---------------------------------------------------------------------------

test('extractStageBlocks: empty brief returns []', () => {
  assert.deepEqual(extractStageBlocks(''), []);
  assert.deepEqual(extractStageBlocks(null), []);
  assert.deepEqual(extractStageBlocks(undefined), []);
});

test('extractStageBlocks: single block returns [] (need >=2 for DSL detection)', () => {
  const brief = 'slide 1: The problem we solve';
  assert.deepEqual(extractStageBlocks(brief), []);
});

test('extractStageBlocks: two numbered slides detected', () => {
  const brief = [
    'slide 1: The problem we solve',
    'slide 2: Our solution',
  ].join('\n');
  const blocks = extractStageBlocks(brief);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].number, 1);
  assert.ok(blocks[0].raw.includes('The problem'));
  assert.equal(blocks[1].number, 2);
  assert.ok(blocks[1].raw.includes('Our solution'));
});

test('extractStageBlocks: stage keyword also matched', () => {
  const brief = [
    'stage 1: Intro',
    'stage 2: Demo',
    'stage 3: Pricing',
  ].join('\n');
  const blocks = extractStageBlocks(brief);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].number, 1);
  assert.equal(blocks[2].number, 3);
});

test('extractStageBlocks: multi-line continuation attached to correct block', () => {
  const brief = [
    'slide 1: The problem',
    'with a second line of context',
    'slide 2: The solution',
  ].join('\n');
  const blocks = extractStageBlocks(brief);
  assert.equal(blocks.length, 2);
  assert.ok(blocks[0].raw.includes('second line'));
});

test('extractStageBlocks: out-of-order numbers sorted', () => {
  const brief = [
    'slide 3: Pricing',
    'slide 1: Intro',
    'slide 2: Demo',
  ].join('\n');
  const blocks = extractStageBlocks(brief);
  assert.equal(blocks[0].number, 1);
  assert.equal(blocks[1].number, 2);
  assert.equal(blocks[2].number, 3);
});

test('extractStageBlocks: step keyword also matched', () => {
  const brief = [
    'step 1: Onboarding',
    'step 2: First value',
  ].join('\n');
  const blocks = extractStageBlocks(brief);
  assert.equal(blocks.length, 2);
});

// ---------------------------------------------------------------------------
// buildStageDescriptors
// ---------------------------------------------------------------------------

test('buildStageDescriptors: produces id, name, caption from blocks', () => {
  const blocks = [
    { number: 1, raw: 'The problem we solve' },
    { number: 2, raw: 'Our unique solution' },
  ];
  const stages = buildStageDescriptors(blocks);
  assert.equal(stages.length, 2);
  assert.ok(typeof stages[0].id === 'string');
  assert.ok(stages[0].id.length > 0);
  assert.equal(stages[0].name, 'Stage 1');
  assert.ok(typeof stages[0].caption.eyebrow === 'string');
  assert.ok(typeof stages[0].caption.headline === 'string');
});

test('buildStageDescriptors: headline truncated at 60 chars with ellipsis', () => {
  const longRaw = 'A'.repeat(80);
  const blocks = [
    { number: 1, raw: longRaw },
    { number: 2, raw: 'Short' },
  ];
  const stages = buildStageDescriptors(blocks);
  assert.ok(stages[0].caption.headline.length <= 63, 'headline should be at most 63 chars (60 + ...)');
  assert.ok(stages[0].caption.headline.endsWith('...'));
});

// ---------------------------------------------------------------------------
// renderYamlSummary
// ---------------------------------------------------------------------------

test('renderYamlSummary: output starts with "stages:"', () => {
  const stages = buildStageDescriptors([
    { number: 1, raw: 'Intro' },
    { number: 2, raw: 'Demo' },
  ]);
  const yaml = renderYamlSummary(stages);
  assert.ok(yaml.startsWith('stages:'));
});

test('renderYamlSummary: each stage has id and name lines', () => {
  const stages = buildStageDescriptors([
    { number: 1, raw: 'Hero moment' },
    { number: 2, raw: 'Problem statement' },
  ]);
  const yaml = renderYamlSummary(stages);
  assert.ok(yaml.includes('id:'));
  assert.ok(yaml.includes('name:'));
});

// ---------------------------------------------------------------------------
// buildDslDraft
// ---------------------------------------------------------------------------

test('buildDslDraft: contains STAGES export', () => {
  const stages = buildStageDescriptors([
    { number: 1, raw: 'Intro section' },
    { number: 2, raw: 'Demo section' },
  ]);
  const draft = buildDslDraft(stages);
  assert.ok(draft.includes('STAGES'));
});

test('buildDslDraft: each stage id appears in draft', () => {
  const stages = buildStageDescriptors([
    { number: 1, raw: 'Hero moment for launch' },
    { number: 2, raw: 'Problem statement investors' },
  ]);
  const draft = buildDslDraft(stages);
  for (const s of stages) {
    assert.ok(draft.includes(s.id), `draft should contain id: ${s.id}`);
  }
});

// ---------------------------------------------------------------------------
// parseChangeCommand
// ---------------------------------------------------------------------------

test('parseChangeCommand: valid change command parsed', () => {
  const cmd = parseChangeCommand('change 1 headline New headline text');
  assert.ok(cmd !== null);
  assert.equal(cmd.stageRef, '1');
  assert.equal(cmd.field, 'headline');
  assert.equal(cmd.newValue, 'New headline text');
});

test('parseChangeCommand: non-change input returns null', () => {
  assert.equal(parseChangeCommand('yes'), null);
  assert.equal(parseChangeCommand('proceed'), null);
  assert.equal(parseChangeCommand(''), null);
});

test('parseChangeCommand: change by id', () => {
  const cmd = parseChangeCommand('change heroMoment eyebrow Slide One');
  assert.ok(cmd !== null);
  assert.equal(cmd.stageRef, 'heroMoment');
  assert.equal(cmd.field, 'eyebrow');
  assert.equal(cmd.newValue, 'Slide One');
});

// ---------------------------------------------------------------------------
// applyChange
// ---------------------------------------------------------------------------

test('applyChange: headline updated by stage number', () => {
  const stages = buildStageDescriptors([
    { number: 1, raw: 'Intro' },
    { number: 2, raw: 'Demo' },
  ]);
  applyChange(stages, { stageRef: '1', field: 'headline', newValue: 'Brand New Headline' });
  assert.equal(stages[0].caption.headline, 'Brand New Headline');
});

test('applyChange: name updated by id', () => {
  const stages = buildStageDescriptors([
    { number: 1, raw: 'Intro section' },
    { number: 2, raw: 'Demo section' },
  ]);
  const targetId = stages[0].id;
  applyChange(stages, { stageRef: targetId, field: 'name', newValue: 'Custom Name' });
  assert.equal(stages[0].name, 'Custom Name');
});

test('applyChange: unknown stage ref is a no-op (no throw)', () => {
  const stages = buildStageDescriptors([
    { number: 1, raw: 'Intro' },
    { number: 2, raw: 'Demo' },
  ]);
  // Should not throw.
  assert.doesNotThrow(() => {
    applyChange(stages, { stageRef: 'nonExistent', field: 'headline', newValue: 'x' });
  });
});

// ---------------------------------------------------------------------------
// parseDsl integration
// ---------------------------------------------------------------------------

test('parseDsl: empty brief returns confirmed=false without prompting', async () => {
  let called = false;
  const result = await parseDsl({
    brief: '',
    _promptFn: async () => { called = true; return 'yes'; },
  });
  assert.equal(result.confirmed, false);
  assert.equal(result.dslDraft, '');
  assert.equal(called, false, 'promptFn should not be called for empty brief');
});

test('parseDsl: brief without numbered stages returns confirmed=false', async () => {
  const result = await parseDsl({
    brief: 'A great pitch deck for investors. Very cinematic.',
    _promptFn: async () => 'yes',
  });
  assert.equal(result.confirmed, false);
  assert.equal(result.dslDraft, '');
});

test('parseDsl: single numbered slide returns confirmed=false (need >=2)', async () => {
  const result = await parseDsl({
    brief: 'slide 1: Hero intro for investors',
    _promptFn: async () => 'yes',
  });
  assert.equal(result.confirmed, false);
});

test('parseDsl: two slides + "yes" confirmation -> dslDraft and confirmed=true', async () => {
  const brief = [
    'slide 1: Hero intro for investors',
    'slide 2: The problem we solve for enterprise',
  ].join('\n');
  const result = await parseDsl({
    brief,
    _promptFn: async () => 'yes',
  });
  assert.equal(result.confirmed, true);
  assert.ok(result.dslDraft.includes('STAGES'));
  assert.equal(result.stages.length, 2);
});

test('parseDsl: "proceed" also confirms', async () => {
  const brief = [
    'stage 1: Intro',
    'stage 2: Solution',
  ].join('\n');
  const result = await parseDsl({ brief, _promptFn: async () => 'proceed' });
  assert.equal(result.confirmed, true);
});

test('parseDsl: "looks good" also confirms', async () => {
  const brief = [
    'step 1: Onboarding',
    'step 2: First value',
  ].join('\n');
  const result = await parseDsl({ brief, _promptFn: async () => 'looks good' });
  assert.equal(result.confirmed, true);
});

test('parseDsl: "skip" returns confirmed=false', async () => {
  const brief = [
    'slide 1: Intro',
    'slide 2: Solution',
  ].join('\n');
  const result = await parseDsl({ brief, _promptFn: async () => 'skip' });
  assert.equal(result.confirmed, false);
  assert.equal(result.dslDraft, '');
});

test('parseDsl: change command amends stage before confirmation', async () => {
  const brief = [
    'slide 1: Original Intro',
    'slide 2: Original Solution',
  ].join('\n');

  let callCount = 0;
  const answers = [
    'change 1 headline Amended Headline',
    'yes',
  ];
  const promptFn = async () => answers[callCount++];

  const result = await parseDsl({ brief, _promptFn: promptFn });
  assert.equal(result.confirmed, true);
  assert.equal(result.stages[0].caption.headline, 'Amended Headline');
  assert.ok(result.dslDraft.includes('Amended Headline'));
});
