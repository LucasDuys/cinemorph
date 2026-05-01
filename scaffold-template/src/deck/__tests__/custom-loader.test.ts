// Custom element loader tests. Validates the registry merge, id derivation,
// collision detection, and error messages without relying on Vite's glob at runtime.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';

/**
 * Derive a camelCase id from a filename.
 * e.g. 'MyChart.tsx' -> 'myChart'
 */
function deriveIdFromFilename(filename: string): string {
  const baseName = filename.replace(/\.tsx?$/, '');
  return baseName.charAt(0).toLowerCase() + baseName.slice(1);
}

test('deriveIdFromFilename: basic PascalCase to camelCase', () => {
  assert.equal(deriveIdFromFilename('MyChart.tsx'), 'myChart');
});

test('deriveIdFromFilename: single uppercase letter', () => {
  assert.equal(deriveIdFromFilename('A.tsx'), 'a');
});

test('deriveIdFromFilename: already lowercase first char', () => {
  assert.equal(deriveIdFromFilename('myChart.tsx'), 'myChart');
});

test('deriveIdFromFilename: strip .ts and .tsx extensions', () => {
  assert.equal(deriveIdFromFilename('MyChart.ts'), 'myChart');
  assert.equal(deriveIdFromFilename('MyChart.tsx'), 'myChart');
});

test('deriveIdFromFilename: camelCase with numbers', () => {
  assert.equal(deriveIdFromFilename('Chart2024.tsx'), 'chart2024');
});

/**
 * Mock registry merge logic. Tests the collision detection and id derivation
 * without requiring import.meta.glob at runtime.
 */
function mergeRegistries(
  autodiscoveredFiles: string[],
  explicitEntries: { id: string }[]
): { ids: Set<string>; error?: string } {
  const registeredIds = new Set<string>();

  // Process auto-discovered
  for (const filename of autodiscoveredFiles) {
    const id = deriveIdFromFilename(filename);
    if (registeredIds.has(id)) {
      return {
        ids: registeredIds,
        error: `Duplicate custom element id: "${id}". Collision between "${filename}" and a prior registration.`
      };
    }
    registeredIds.add(id);
  }

  // Process explicit registry
  for (const entry of explicitEntries) {
    if (registeredIds.has(entry.id)) {
      return {
        ids: registeredIds,
        error: `Duplicate custom element id: "${entry.id}". Collision between customRegistry.ts and auto-discovered file.`
      };
    }
    registeredIds.add(entry.id);
  }

  return { ids: registeredIds };
}

test('mergeRegistries: auto-discovered only', () => {
  const result = mergeRegistries(['MyChart.tsx', 'DataTable.tsx'], []);
  assert.deepEqual(Array.from(result.ids).sort(), ['dataTable', 'myChart']);
  assert.equal(result.error, undefined);
});

test('mergeRegistries: explicit registry only', () => {
  const result = mergeRegistries([], [{ id: 'myChart' }, { id: 'dataTable' }]);
  assert.deepEqual(Array.from(result.ids).sort(), ['dataTable', 'myChart']);
  assert.equal(result.error, undefined);
});

test('mergeRegistries: mixed auto and explicit, no collisions', () => {
  const result = mergeRegistries(
    ['MyChart.tsx'],
    [{ id: 'dataTable' }]
  );
  assert.deepEqual(Array.from(result.ids).sort(), ['dataTable', 'myChart']);
  assert.equal(result.error, undefined);
});

test('mergeRegistries: auto-discovery collision (same filename twice)', () => {
  const result = mergeRegistries(['MyChart.tsx', 'myChart.tsx'], []);
  assert.ok(result.error);
  assert.match(result.error, /Duplicate custom element id: "myChart"/);
});

test('mergeRegistries: explicit registry collision (same id twice)', () => {
  const result = mergeRegistries([], [{ id: 'myChart' }, { id: 'myChart' }]);
  assert.ok(result.error);
  assert.match(result.error, /Duplicate custom element id: "myChart"/);
});

test('mergeRegistries: collision between auto and explicit', () => {
  const result = mergeRegistries(['MyChart.tsx'], [{ id: 'myChart' }]);
  assert.ok(result.error);
  assert.match(result.error, /customRegistry.ts and auto-discovered file/);
});

test('mergeRegistries: case sensitivity in collision detection', () => {
  // 'MyChart.tsx' derives to 'myChart', and explicit 'myChart' should collide
  const result = mergeRegistries(['MyChart.tsx'], [{ id: 'myChart' }]);
  assert.ok(result.error);
});

test('mergeRegistries: no collision if explicit uses different case', () => {
  // 'MyChart.tsx' derives to 'myChart', explicit 'MyChart' is different
  const result = mergeRegistries([], [{ id: 'MyChart' }, { id: 'myChart' }]);
  assert.deepEqual(Array.from(result.ids).sort(), ['MyChart', 'myChart']);
  assert.equal(result.error, undefined);
});

test('mergeRegistries: empty registries', () => {
  const result = mergeRegistries([], []);
  assert.deepEqual(Array.from(result.ids), []);
  assert.equal(result.error, undefined);
});
