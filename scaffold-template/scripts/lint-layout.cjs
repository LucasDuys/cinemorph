/**
 * Layout lint script: validates stage element positions and dimensions.
 * Errors fail the build; warnings print but do not fail.
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse a percentage string (e.g. "50%") to a number (0-100).
 * Returns null if invalid format.
 */
function parsePercent(str) {
  const match = String(str).match(/^([-\d.]+)%$/);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Check if a layout is the HIDDEN anchor (center, 0% size, opacity 0).
 */
function isHidden(layout) {
  const pos = layout.pos;
  const left = parsePercent(pos.left);
  const top = parsePercent(pos.top);
  const width = parsePercent(pos.width);
  const height = parsePercent(pos.height);
  return left === 50 && top === 50 && width === 0 && height === 0;
}

/**
 * Lint a stages object (parsed from stages.json or required stages.ts).
 * Returns { errors: [...], warnings: [...] }
 */
function lintLayout(stagesObj) {
  const errors = [];
  const warnings = [];

  if (!stagesObj || !stagesObj.stages) {
    return { errors, warnings };
  }

  for (const stage of stagesObj.stages) {
    const stageId = stage.id || '?';

    // Check caption headline length
    if (stage.caption?.headline) {
      const len = stage.caption.headline.length;
      if (len > 26) {
        warnings.push(`Stage ${stageId}: caption headline exceeds 26 characters (${len}ch)`);
      }
    }

    // Count non-HIDDEN elements
    const elements = stage.elements || {};
    const elemIds = Object.keys(elements);
    const nonHiddenCount = elemIds.filter(id => !isHidden(elements[id])).length;
    if (nonHiddenCount > 12) {
      warnings.push(`Stage ${stageId}: ${nonHiddenCount} primitives (> 12)`);
    }

    // Check bounds and duplicates
    const layouts = [];
    for (const elemId of elemIds) {
      const elem = elements[elemId];
      if (!elem.pos) continue;

      const left = parsePercent(elem.pos.left);
      const top = parsePercent(elem.pos.top);
      const width = parsePercent(elem.pos.width);
      const height = parsePercent(elem.pos.height);

      // Validate all are valid numbers
      if (left === null || top === null || width === null || height === null) {
        errors.push(`Stage ${stageId} ${elemId}: invalid position format`);
        continue;
      }

      // Check bounds
      if (left < 0 || left > 100) {
        errors.push(`Stage ${stageId} ${elemId}: left ${elem.pos.left} outside [0%, 100%]`);
      }
      if (top < 0 || top > 100) {
        errors.push(`Stage ${stageId} ${elemId}: top ${elem.pos.top} outside [0%, 100%]`);
      }
      if (width > 100) {
        errors.push(`Stage ${stageId} ${elemId}: width ${elem.pos.width} exceeds 100%`);
      }
      if (height > 100) {
        errors.push(`Stage ${stageId} ${elemId}: height ${elem.pos.height} exceeds 100%`);
      }

      // Track non-HIDDEN layouts for duplicate check
      if (!isHidden(elem)) {
        layouts.push({ elemId, left, top, width, height });
      }
    }

    // Detect duplicate persistent layouts
    for (let i = 0; i < layouts.length; i++) {
      for (let j = i + 1; j < layouts.length; j++) {
        const a = layouts[i];
        const b = layouts[j];
        if (a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height) {
          errors.push(
            `Stage ${stageId}: duplicate layout detected (${a.elemId} and ${b.elemId} both at ` +
            `left=${a.left}%, top=${a.top}%, width=${a.width}%, height=${a.height}%)`
          );
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * CLI entry point: node lint-layout.cjs [stagesPath]
 * Tries to read stages.json (if provided) or requires stages.ts.
 */
async function main() {
  const stagesPath = process.argv[2] || './src/deck/stages.ts';

  let stagesObj;

  // Try .json first
  if (stagesPath.endsWith('.json')) {
    try {
      const content = fs.readFileSync(stagesPath, 'utf8');
      stagesObj = { stages: JSON.parse(content) };
    } catch (e) {
      console.error(`Error reading ${stagesPath}:`, e.message);
      process.exit(1);
    }
  } else {
    // Require .ts (assumes tsx/register or bun context)
    try {
      stagesObj = { stages: require(path.resolve(stagesPath)).STAGES || [] };
    } catch (e) {
      console.error(`Error requiring ${stagesPath}:`, e.message);
      process.exit(1);
    }
  }

  const { errors, warnings } = lintLayout(stagesObj);

  // Print warnings
  for (const warn of warnings) {
    console.warn(`⚠️  ${warn}`);
  }

  // Print errors
  for (const err of errors) {
    console.error(`✖️  ${err}`);
  }

  // Exit code
  if (errors.length > 0) {
    console.error(`\nLayout lint failed with ${errors.length} error(s).`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`\nLayout lint passed with ${warnings.length} warning(s).`);
  } else {
    console.log('Layout lint passed.');
  }
}

module.exports = { lintLayout, parsePercent, isHidden };

// Run CLI if called directly
if (require.main === module) {
  main();
}
