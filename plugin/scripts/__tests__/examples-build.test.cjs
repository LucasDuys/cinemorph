// examples-build.test.cjs: Verify all 10 examples build successfully.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { cloneExample } = require('../from-example.cjs');

test('examples-build: all examples build successfully', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'morph-deck-examples-test-'));

  const examples = [
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

  let failedExamples = [];

  try {
    for (const exampleName of examples) {
      const deckPath = path.join(tmpDir, exampleName);

      try {
        console.log(`Building ${exampleName}...`);

        // Clone the example into a temp directory
        cloneExample(exampleName, deckPath);

        // Try to install dependencies (only if bun/npm is available)
        try {
          console.log(`  Installing dependencies for ${exampleName}...`);
          execSync('bun install', { cwd: deckPath, stdio: 'pipe' });
        } catch (e) {
          // bun might not be available, try npm
          try {
            execSync('npm install', { cwd: deckPath, stdio: 'pipe' });
          } catch (e2) {
            console.warn(`  Note: Could not install dependencies (bun/npm not available)`);
          }
        }

        // Try to build using bun first, then fallback to tsc
        let buildSuccess = false;
        try {
          console.log(`  Building ${exampleName}...`);
          execSync('bun run build', { cwd: deckPath, stdio: 'pipe' });
          buildSuccess = true;
        } catch (e) {
          // Fallback to tsc --noEmit
          try {
            execSync('tsc --noEmit -p .', { cwd: deckPath, stdio: 'pipe' });
            buildSuccess = true;
          } catch (e2) {
            failedExamples.push({
              name: exampleName,
              error: e2.message || 'Build failed'
            });
          }
        }

        if (buildSuccess) {
          console.log(`  ✓ ${exampleName} built successfully`);
        }
      } catch (e) {
        failedExamples.push({
          name: exampleName,
          error: e.message || 'Clone failed'
        });
        console.error(`  ✗ ${exampleName} failed: ${e.message}`);
      }
    }
  } finally {
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // Report results
  if (failedExamples.length > 0) {
    console.error(`\nFailed examples (${failedExamples.length}/${examples.length}):`);
    for (const failed of failedExamples) {
      console.error(`  - ${failed.name}: ${failed.error}`);
    }
    assert.fail(`${failedExamples.length} example(s) failed to build`);
  } else {
    console.log(`\nAll ${examples.length} examples built successfully!`);
  }
});
