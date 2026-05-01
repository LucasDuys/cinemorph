// Manifest test: verifies all primitives have JSDoc, default export, no motion.div wrapper.
// Also verifies index.ts exports all primitives by name.
// T010: Primitives no longer import MORPH_TRANSITION (MorphBox handles wrapping).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PRIMITIVES_DIR = path.resolve(__dirname, '..');
const EXPECTED_PRIMITIVES = [
  'Wordmark',
  'ConnectorChip',
  'KPI',
  'Card',
  'Pillar',
  'Quote',
  'Logo',
  'OrbitGroup',
  'PipelineGroup',
  'FooterStrip',
  'StatGroup',
  'Diagram',
  'Image',
  'Icon',
  'Chart',
  'MorphChart',
];

function listTsxFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => entry.name);
}

test('every primitive .tsx has JSDoc and default export', () => {
  const tsxFiles = listTsxFiles(PRIMITIVES_DIR);
  assert.equal(
    tsxFiles.length,
    EXPECTED_PRIMITIVES.length,
    `expected ${EXPECTED_PRIMITIVES.length} primitives, found ${tsxFiles.length}: ${tsxFiles.join(', ')}`,
  );

  for (const fileName of tsxFiles) {
    const filePath = path.join(PRIMITIVES_DIR, fileName);
    const src = fs.readFileSync(filePath, 'utf8');

    assert.match(src, /\/\*\*[\s\S]*?\*\//, `${fileName} missing JSDoc /** ... */ block`);
    assert.match(src, /export\s+default\s+function/, `${fileName} missing 'export default function'`);
  }
});

test('every expected primitive name has a corresponding .tsx file', () => {
  const tsxFiles = new Set(listTsxFiles(PRIMITIVES_DIR));
  for (const name of EXPECTED_PRIMITIVES) {
    assert.ok(tsxFiles.has(`${name}.tsx`), `missing primitive file: ${name}.tsx`);
  }
});

test('index.ts exists and exports all primitives by name', () => {
  const indexPath = path.join(PRIMITIVES_DIR, 'index.ts');
  assert.ok(fs.existsSync(indexPath), 'index.ts does not exist');
  const src = fs.readFileSync(indexPath, 'utf8');
  for (const name of EXPECTED_PRIMITIVES) {
    const pattern = new RegExp(
      `export\\s*\\{\\s*default\\s+as\\s+${name}\\s*\\}\\s*from\\s*['"]\\.\\/${name}['"]`,
    );
    assert.match(src, pattern, `index.ts missing export for ${name}`);
  }
});

test('primitives have no outer motion.div wrapper (MorphBox handles wrapping)', () => {
  const tsxFiles = listTsxFiles(PRIMITIVES_DIR);
  const exceptions = new Set(['ConnectorChip', 'MorphChart', 'OrbitGroup', 'PipelineGroup', 'FooterStrip']);

  for (const fileName of tsxFiles) {
    if (exceptions.has(fileName.replace('.tsx', ''))) {
      continue; // These can use motion in inner items
    }
    const filePath = path.join(PRIMITIVES_DIR, fileName);
    const src = fs.readFileSync(filePath, 'utf8');

    // Check that outer return is not motion.div (basic heuristic: "return (" followed by "motion.div")
    // This is a compile-time check; full validation requires TypeScript.
    if (src.includes('return (') && src.includes('motion.div')) {
      const returnSection = src.split('return (')[1];
      if (returnSection && returnSection.startsWith('<motion.div')) {
        assert.fail(`${fileName} has outer motion.div wrapper (should be plain div)`);
      }
    }
  }
});
