'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Get registry root from env or default to ~/.claude/plugins/morph-deck/references
const getRegistryRoot = () => {
  if (process.env.MORPH_DECK_REFERENCES_DIR) {
    return process.env.MORPH_DECK_REFERENCES_DIR;
  }
  const home = os.homedir();
  return path.join(home, '.claude', 'plugins', 'morph-deck', 'references');
};

/**
 * Add a reference deck to the global registry.
 * Writes to ~/.claude/plugins/morph-deck/references/<name>.json
 *
 * @param {Object} options
 * @param {string} options.sourcePath - Absolute path to the deck directory
 * @param {string} options.name - Reference name (used as file base name)
 * @param {string} [options.brief] - Optional brief description of the deck
 * @param {Object} [options.tokenSnapshot] - Optional snapshot of tokens used
 */
function addReference({ sourcePath, name, brief, tokenSnapshot }) {
  const registryRoot = getRegistryRoot();

  // Create registry directory if it doesn't exist
  fs.mkdirSync(registryRoot, { recursive: true });

  // Build the reference object
  const reference = {
    sourcePath,
    brief: brief || undefined,
    tokenSnapshot: tokenSnapshot || undefined,
    addedAt: new Date().toISOString(),
  };

  // Remove undefined fields to keep JSON clean
  Object.keys(reference).forEach(key => {
    if (reference[key] === undefined) {
      delete reference[key];
    }
  });

  // Write to registry file
  const registryPath = path.join(registryRoot, `${name}.json`);
  fs.writeFileSync(registryPath, JSON.stringify(reference, null, 2), 'utf8');
}

/**
 * Resolve a reference name or file path to an absolute deck path.
 *
 * If the argument looks like a file path (contains / or \ or .), return it directly.
 * Otherwise, look it up in the registry.
 *
 * @param {string} nameOrPath - Reference name or file path
 * @returns {string} Absolute path to the deck
 * @throws {Error} If name not found in registry
 */
function resolveReference(nameOrPath) {
  // Check if it looks like a file path
  if (nameOrPath.includes('/') || nameOrPath.includes('\\') || nameOrPath.includes('.')) {
    return nameOrPath;
  }

  // Otherwise, look up in registry
  const registryRoot = getRegistryRoot();
  const registryPath = path.join(registryRoot, `${nameOrPath}.json`);

  if (!fs.existsSync(registryPath)) {
    throw new Error(
      `Reference '${nameOrPath}' not found in registry at ${registryPath}. ` +
      `Use '/morph-deck reference list' to see registered decks.`
    );
  }

  const content = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  return content.sourcePath;
}

/**
 * List all registered reference decks.
 *
 * @returns {Array<Object>} Array of reference objects with { name, sourcePath, brief, addedAt, tokenSnapshot }
 */
function listReferences() {
  const registryRoot = getRegistryRoot();

  // Return empty array if registry doesn't exist yet
  if (!fs.existsSync(registryRoot)) {
    return [];
  }

  const files = fs.readdirSync(registryRoot, { withFileTypes: true });
  const references = [];

  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.json')) {
      continue;
    }

    try {
      const registryPath = path.join(registryRoot, file.name);
      const content = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const name = file.name.slice(0, -5); // Remove .json extension

      references.push({
        name,
        ...content,
      });
    } catch (err) {
      // Skip malformed files; log a warning if needed
      console.warn(`Warning: failed to read reference ${file.name}: ${err.message}`);
    }
  }

  // Sort by addedAt descending (newest first)
  references.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

  return references;
}

module.exports = {
  addReference,
  resolveReference,
  listReferences,
};
