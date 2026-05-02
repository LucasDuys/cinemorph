#!/usr/bin/env node
// from-example.cjs: Clone an example deck into a target directory.
// Copies scaffold-template/* into target, then merges example's stages/data/tokens into it.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function main() {
  const args = process.argv.slice(2);
  let exampleName = null;
  let targetPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--example' && i + 1 < args.length) {
      exampleName = args[i + 1];
      i++;
    } else if (args[i] === '--target' && i + 1 < args.length) {
      targetPath = args[i + 1];
      i++;
    }
  }

  if (!exampleName) {
    console.error('Error: --example <name> is required');
    process.exit(1);
  }

  if (!targetPath) {
    console.error('Error: --target <path> is required');
    process.exit(1);
  }

  try {
    cloneExample(exampleName, targetPath);
    console.log(`Successfully created deck from example: ${exampleName}`);
    console.log(`Deck path: ${path.resolve(targetPath)}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function cloneExample(exampleName, targetPath) {
  // Resolve example directory
  const pluginDir = path.join(__dirname, '..');
  const exampleDir = path.join(pluginDir, 'examples', exampleName);

  if (!fs.existsSync(exampleDir)) {
    throw new Error(`Example not found: ${exampleName}. Check examples/ directory.`);
  }

  // Resolve scaffold template
  const scaffoldDir = path.join(__dirname, '..', '..', 'scaffold-template');

  if (!fs.existsSync(scaffoldDir)) {
    throw new Error(`Scaffold template not found at ${scaffoldDir}`);
  }

  // Create target directory
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  // Copy entire scaffold-template to target
  execSync(`cp -r "${scaffoldDir}"/* "${targetPath}"`, { stdio: 'inherit' });

  // Merge example files:
  // 1. stages.ts: Extract STAGES export from example and append to scaffold's stages.ts
  // 2. data.ts: Replace entirely
  // 3. tokens.ts: Replace entirely

  const exampleStages = path.join(exampleDir, 'stages.ts');
  const exampleData = path.join(exampleDir, 'data.ts');
  const exampleTokens = path.join(exampleDir, 'tokens.ts');

  const targetStages = path.join(targetPath, 'src', 'deck', 'stages.ts');
  const targetData = path.join(targetPath, 'src', 'deck', 'data.ts');
  const targetTokens = path.join(targetPath, 'src', 'deck', 'tokens.ts');

  // For stages.ts: extract STAGES from example and replace the empty array in scaffold
  if (fs.existsSync(exampleStages)) {
    const exampleContent = fs.readFileSync(exampleStages, 'utf-8');
    // Extract the STAGES export from example
    const stagesMatch = exampleContent.match(/export const STAGES[^=]*=\s*(\[[\s\S]*?\]);/);
    if (stagesMatch) {
      const scaffoldContent = fs.readFileSync(targetStages, 'utf-8');
      // Replace the empty STAGES array in scaffold with the example's STAGES
      const merged = scaffoldContent.replace(
        /export const STAGES: StageConfig\[\]\s*=\s*\[\];/,
        `export const STAGES: StageConfig[] = ${stagesMatch[1]};`
      );
      fs.writeFileSync(targetStages, merged, 'utf-8');
    }
  }

  // For data.ts: replace entirely
  if (fs.existsSync(exampleData)) {
    fs.copyFileSync(exampleData, targetData);
  }

  // For tokens.ts: replace entirely
  if (fs.existsSync(exampleTokens)) {
    fs.copyFileSync(exampleTokens, targetTokens);
  }

  return { deckPath: targetPath, name: exampleName };
}

if (require.main === module) {
  main();
}

module.exports = { cloneExample };
