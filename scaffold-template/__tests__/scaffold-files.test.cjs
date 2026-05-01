// Structural test for T005 scaffold-template.
// Verifies all 10 expected files exist, JSON files parse, and TS/JS/CSS/HTML
// files contain the load-bearing exports / declarations referenced by
// downstream tasks (T009 deck runtime, T014 tokens emitter).
//
// Per task brief: we DO NOT install deps or run vite -- too slow / network.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

test('package.json: parses + has correct name + required deps + scripts', () => {
  assert.ok(exists('package.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'morph-deck-scaffold-template');
  // dependencies
  assert.ok(pkg.dependencies.react?.startsWith('^18'));
  assert.ok(pkg.dependencies['react-dom']?.startsWith('^18'));
  assert.ok(pkg.dependencies.motion?.startsWith('^11'));
  // devDependencies
  assert.ok(pkg.devDependencies.tailwindcss?.startsWith('^3'));
  assert.ok(pkg.devDependencies.postcss?.startsWith('^8'));
  assert.ok(pkg.devDependencies.autoprefixer?.startsWith('^10'));
  assert.ok(pkg.devDependencies['@vitejs/plugin-react']?.startsWith('^4'));
  assert.ok(pkg.devDependencies.vite?.startsWith('^6'));
  assert.ok(pkg.devDependencies.typescript?.startsWith('^5'));
  assert.ok(pkg.devDependencies['@types/react']?.startsWith('^18'));
  assert.ok(pkg.devDependencies['@types/react-dom']?.startsWith('^18'));
  // scripts
  assert.equal(pkg.scripts.dev, 'vite');
  assert.equal(pkg.scripts.build, 'tsc && vite build');
  assert.equal(pkg.scripts.preview, 'vite preview --port 4173 --host');
  assert.match(pkg.scripts['lint:layout'], /placeholder|echo/);
});

test('vite.config.ts: imports react plugin + exports defineConfig', () => {
  assert.ok(exists('vite.config.ts'));
  const src = read('vite.config.ts');
  assert.match(src, /@vitejs\/plugin-react/);
  assert.match(src, /defineConfig\s*\(/);
  assert.match(src, /plugins:\s*\[react\(\)\]/);
});

test('tsconfig.json: strict + ES2022 target + correct lib + jsx react-jsx + Bundler resolution', () => {
  assert.ok(exists('tsconfig.json'));
  const ts = JSON.parse(read('tsconfig.json'));
  const co = ts.compilerOptions;
  assert.equal(co.strict, true);
  assert.equal(co.target, 'ES2022');
  assert.deepEqual(co.lib, ['DOM', 'DOM.Iterable', 'ES2022']);
  assert.equal(co.jsx, 'react-jsx');
  assert.equal(co.module, 'ESNext');
  assert.equal(co.moduleResolution, 'Bundler');
  assert.deepEqual(ts.include, ['src']);
});

test('tailwind.config.ts: content globs + theme.extend.colors via CSS vars + fontFamily via vars', () => {
  assert.ok(exists('tailwind.config.ts'));
  const src = read('tailwind.config.ts');
  assert.match(src, /\.\/index\.html/);
  assert.match(src, /\.\/src\/\*\*\/\*\.\{ts,tsx\}/);
  // CSS variable bindings for color tokens
  for (const v of [
    '--background',
    '--foreground',
    '--muted-foreground',
    '--border',
    '--surface-base',
    '--surface-subtle',
    '--surface-raised',
    '--success',
    '--info',
    '--warning',
    '--destructive'
  ]) {
    assert.match(src, new RegExp(`var\\(${v}\\)`), `expected var(${v}) in tailwind.config.ts`);
  }
  // fontFamily via vars
  assert.match(src, /var\(--font-display\)/);
  assert.match(src, /var\(--font-body\)/);
  assert.match(src, /var\(--font-mono\)/);
});

test('postcss.config.js: exports tailwindcss + autoprefixer plugins', () => {
  assert.ok(exists('postcss.config.js'));
  const src = read('postcss.config.js');
  assert.match(src, /tailwindcss/);
  assert.match(src, /autoprefixer/);
  assert.match(src, /module\.exports/);
});

test('index.html: doctype + lang=en + #root + main.tsx script + Google Fonts preconnect', () => {
  assert.ok(exists('index.html'));
  const src = read('index.html');
  assert.match(src, /<!doctype html>/i);
  assert.match(src, /<html lang="en">/);
  assert.match(src, /<div id="root"><\/div>/);
  assert.match(src, /<script type="module" src="\/src\/main\.tsx"><\/script>/);
  assert.match(src, /<title>Morph-Deck Presentation<\/title>/);
  assert.match(src, /preconnect.*fonts\.googleapis\.com/);
  assert.match(src, /preconnect.*fonts\.gstatic\.com/);
  assert.match(src, /family=Inter/);
  assert.match(src, /family=Space\+Grotesk|Space\+Grotesk/);
  assert.match(src, /family=JetBrains\+Mono|JetBrains\+Mono/);
});

test('src/main.tsx: imports React + ReactDOM + App + index.css; uses StrictMode + createRoot', () => {
  assert.ok(exists('src/main.tsx'));
  const src = read('src/main.tsx');
  assert.match(src, /import React from 'react'/);
  assert.match(src, /import ReactDOM from 'react-dom\/client'/);
  assert.match(src, /import App from '\.\/App'/);
  assert.match(src, /import '\.\/index\.css'/);
  assert.match(src, /ReactDOM\.createRoot/);
  assert.match(src, /<React\.StrictMode>/);
  assert.match(src, /<App\s*\/>/);
});

test('src/App.tsx: default export + uses bg-background / text-foreground utility classes', () => {
  assert.ok(exists('src/App.tsx'));
  const src = read('src/App.tsx');
  assert.match(src, /export default function App/);
  assert.match(src, /bg-background/);
  assert.match(src, /text-foreground/);
  assert.match(src, /T009/); // placeholder comment references the replacement task
});

test('src/index.css: tailwind directives + :root CSS vars matching tokens.ts THEME defaults', () => {
  assert.ok(exists('src/index.css'));
  const src = read('src/index.css');
  assert.match(src, /@tailwind base;/);
  assert.match(src, /@tailwind components;/);
  assert.match(src, /@tailwind utilities;/);
  assert.match(src, /:root\s*\{/);
  // Hardcoded defaults from tokens.ts THEME
  const vars = [
    ['--background', '#0A0E1A'],
    ['--foreground', '#F5F7FA'],
    ['--muted-foreground', '#8A93A6'],
    ['--border', '#1F2937'],
    ['--surface-base', '#0F1420'],
    ['--surface-subtle', '#151A28'],
    ['--surface-raised', '#1C2333'],
    ['--success', '#10B981'],
    ['--info', '#3B82F6'],
    ['--warning', '#F59E0B'],
    ['--destructive', '#EF4444']
  ];
  for (const [name, value] of vars) {
    // case-insensitive hex match (allow #abc or #ABC)
    const re = new RegExp(`${name}:\\s*${value}`, 'i');
    assert.match(src, re, `expected ${name}: ${value} in :root`);
  }
  // Font vars present
  assert.match(src, /--font-display:/);
  assert.match(src, /--font-body:/);
  assert.match(src, /--font-mono:/);
  // Body + html/body/#root rules
  assert.match(src, /@apply\s+bg-background\s+text-foreground/);
  assert.match(src, /html,\s*body,\s*#root\s*\{[^}]*height:\s*100%[^}]*overflow:\s*hidden/s);
});

test('.gitignore: ignores node_modules / dist / .vite / .morph-deck', () => {
  assert.ok(exists('.gitignore'));
  const src = read('.gitignore');
  assert.match(src, /^node_modules$/m);
  assert.match(src, /^dist$/m);
  assert.match(src, /^\.vite$/m);
  assert.match(src, /^\.morph-deck$/m);
});
