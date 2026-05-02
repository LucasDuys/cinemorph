'use strict';

/**
 * Install hook for morph-deck plugin.
 * Called once when the plugin is first installed.
 *
 * This script auto-registers the user's existing stacklink pitch deck
 * as a reference if the path exists.
 *
 * NOTE: The references/ directory is user data that must survive plugin
 * updates. When updating the plugin, the update mechanism should NOT
 * delete or overwrite ~/.claude/plugins/morph-deck/references/. This
 * directory is managed by the user, not by the plugin.
 */

const { addReference } = require('./reference-registry.cjs');
const fs = require('node:fs');

const STACKLINK_PITCH_PATH = 'C:/dev/stacklink-pitch-roundone/pitch-app';

/**
 * Check if the stacklink pitch deck exists and register it as a reference.
 */
function installHook() {
  try {
    if (!fs.existsSync(STACKLINK_PITCH_PATH)) {
      console.log('[morph-deck install] Stacklink pitch deck not found at', STACKLINK_PITCH_PATH);
      console.log('[morph-deck install] Skipping auto-registration (can be added later with /morph-deck reference add)');
      return;
    }

    console.log('[morph-deck install] Found stacklink pitch deck, registering as reference...');

    const brief = 'Stacklink, Sovereign Knowledge OS for regulated EU mid-market, ' +
                  '5-slide pitch for Round One Ventures workshop. Two-student team. ' +
                  'Not raising. Asks: people to talk to, honest feedback, stay in touch.';

    addReference({
      sourcePath: STACKLINK_PITCH_PATH,
      name: 'stacklink-roundone-2026-04',
      brief,
    });

    console.log('[morph-deck install] Registered as "stacklink-roundone-2026-04"');
  } catch (err) {
    console.error('[morph-deck install] Error during install hook:', err.message);
    // Don't fail the install, just warn
  }
}

// Run the hook
if (require.main === module) {
  installHook();
}

module.exports = { installHook };
