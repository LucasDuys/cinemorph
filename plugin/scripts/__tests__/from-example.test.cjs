// from-example.test.cjs: Test the from-example cloning script.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { cloneExample } = require('../from-example.cjs');

test('from-example: clones scaffold + overwrites deck files', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'morph-deck-test-'));

  try {
    // Create a temp target directory for the new deck
    const targetPath = path.join(tmpDir, 'test-deck');

    // Clone the pitch-5slide example
    const result = cloneExample('pitch-5slide', targetPath);

    assert.equal(result.name, 'pitch-5slide', 'Result name should match');
    assert.ok(fs.existsSync(targetPath), 'Target deck directory should exist');

    // Verify scaffold files were copied
    assert.ok(fs.existsSync(path.join(targetPath, 'package.json')), 'package.json should be copied');
    assert.ok(fs.existsSync(path.join(targetPath, 'vite.config.ts')), 'vite.config.ts should be copied');
    assert.ok(fs.existsSync(path.join(targetPath, 'src', 'App.tsx')), 'src/App.tsx should be copied');

    // Verify deck source files were overwritten
    const stagesPath = path.join(targetPath, 'src', 'deck', 'stages.ts');
    assert.ok(fs.existsSync(stagesPath), 'stages.ts should exist');

    const stagesContent = fs.readFileSync(stagesPath, 'utf-8');
    assert.match(stagesContent, /Pitch 5-slide|Problem/, 'stages.ts should contain example content');
    assert.match(stagesContent, /Problem/, 'stages.ts should have Problem stage');

    // Verify data.ts was copied
    const dataPath = path.join(targetPath, 'src', 'deck', 'data.ts');
    assert.ok(fs.existsSync(dataPath), 'data.ts should exist');

    // Verify tokens.ts was copied
    const tokensPath = path.join(targetPath, 'src', 'deck', 'tokens.ts');
    assert.ok(fs.existsSync(tokensPath), 'tokens.ts should exist');
  } finally {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('from-example: error on missing example name', async (t) => {
  assert.throws(
    () => cloneExample('nonexistent-example', '/tmp/deck'),
    /Example not found/,
    'Should throw error for nonexistent example'
  );
});

test('from-example: all 10 examples exist', async (t) => {
  const pluginDir = path.join(__dirname, '..', '..');
  const examplesDir = path.join(pluginDir, 'examples');

  const expectedExamples = [
    'pitch-5slide',
    'launch-cinematic-30s',
    'kpi-dashboard-tour',
    'manifesto',
    'feature-demo',
    'retro-storyboard',
    'team-intro',
    'case-study',
    'release-notes',
    'roadmap'
  ];

  for (const exampleName of expectedExamples) {
    const examplePath = path.join(examplesDir, exampleName);
    assert.ok(fs.existsSync(examplePath), `Example ${exampleName} should exist`);
    assert.ok(fs.existsSync(path.join(examplePath, 'brief.md')), `${exampleName}/brief.md should exist`);
    assert.ok(fs.existsSync(path.join(examplePath, 'stages.ts')), `${exampleName}/stages.ts should exist`);
    assert.ok(fs.existsSync(path.join(examplePath, 'data.ts')), `${exampleName}/data.ts should exist`);
    assert.ok(fs.existsSync(path.join(examplePath, 'tokens.ts')), `${exampleName}/tokens.ts should exist`);
    assert.ok(fs.existsSync(path.join(examplePath, 'README.md')), `${exampleName}/README.md should exist`);
  }
});
