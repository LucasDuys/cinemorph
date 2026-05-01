// Custom element loader. Discovers .tsx files in src/deck/elements/custom/
// via Vite's import.meta.glob, derives element ids from filenames, and merges
// with explicit registrations from customRegistry. Both flows register via the
// elements.tsx dispatcher (registerElement).

import type React from 'react';
import type { ElementLayout } from '../stages';
import { registerElement } from '../elements';
import { CUSTOM_ELEMENTS } from './customRegistry';

// Type for glob module contents
type GlobModule = {
  default: React.FC<any>;
};

/**
 * Derive a camelCase id from a filename.
 * e.g. 'MyChart.tsx' -> 'myChart'
 */
function deriveIdFromFilename(filename: string): string {
  const baseName = filename.replace(/\.tsx?$/, '');
  return baseName.charAt(0).toLowerCase() + baseName.slice(1);
}

/**
 * Load and register all custom elements. Called at module initialization
 * to register both auto-discovered files and explicit registry entries.
 */
export function loadCustomElements(): void {
  const registeredIds = new Set<string>();

  // Load auto-discovered files from src/deck/elements/custom/*.tsx
  const globModules = import.meta.glob<GlobModule>(
    './custom/*.tsx',
    { eager: true }
  );

  for (const [filePath, module] of Object.entries(globModules)) {
    const filename = filePath.split('/').pop()!;
    const id = deriveIdFromFilename(filename);

    if (registeredIds.has(id)) {
      throw new Error(
        `Duplicate custom element id: "${id}". Collision between "${filename}" and a prior registration. ` +
        `Rename one file or remove the explicit registry entry.`
      );
    }

    registeredIds.add(id);

    const Component = module.default;
    if (!Component) {
      throw new Error(
        `Custom element file "${filename}" does not export a default component. ` +
        `Export your component as: export default MyChart;`
      );
    }

    registerElement(id, Component);
  }

  // Load explicit registry entries
  for (const entry of CUSTOM_ELEMENTS) {
    if (registeredIds.has(entry.id)) {
      throw new Error(
        `Duplicate custom element id: "${entry.id}". Collision between customRegistry.ts and auto-discovered file. ` +
        `Remove the registry entry or rename the file.`
      );
    }

    registeredIds.add(entry.id);
    registerElement(entry.id, entry.component);
  }
}

/**
 * Resolve a custom element id to its component.
 * Throws a clear error if the id is not registered.
 */
export function resolveCustomElement(id: string): React.FC<any> {
  // Try to import the module fresh (for dev-mode hot-reload compatibility)
  const globModules = import.meta.glob<GlobModule>(
    './custom/*.tsx',
    { eager: true }
  );

  for (const [filePath, module] of Object.entries(globModules)) {
    const filename = filePath.split('/').pop()!;
    const derivedId = deriveIdFromFilename(filename);
    if (derivedId === id) {
      return module.default;
    }
  }

  // Check explicit registry
  const registryEntry = CUSTOM_ELEMENTS.find((e) => e.id === id);
  if (registryEntry) {
    return registryEntry.component;
  }

  throw new Error(
    `Unknown custom element: "${id}". Add to customRegistry.ts or place a .tsx file at src/deck/elements/custom/. ` +
    `Example: drop MyChart.tsx in src/deck/elements/custom/ and use id "myChart", ` +
    `or add an entry to CUSTOM_ELEMENTS in customRegistry.ts.`
  );
}

// Auto-initialize on module load
loadCustomElements();
