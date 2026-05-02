'use strict';

/**
 * Install hook for cinemorph plugin.
 * Called once when the plugin is first installed.
 *
 * The plugin ships self-contained — bundled example decks live under
 * plugin/examples/ and are accessible via `/cinemorph new --from-example <name>`.
 * No external paths or per-user references are auto-registered. Users add their
 * own decks as references via `/cinemorph reference add <path> --name <name>`.
 *
 * NOTE: The references/ directory under ~/.claude/plugins/cinemorph/references/
 * is user data and must survive plugin updates. The update mechanism should NOT
 * delete or overwrite it.
 */

function installHook() {
  console.log('[cinemorph install] Plugin installed.');
  console.log('[cinemorph install] Try: /cinemorph new --from-example stacklink-roundone-pitch');
  console.log('[cinemorph install] Or:  /cinemorph new --from-example launch-cinematic-30s');
  console.log('[cinemorph install] Add your own deck as a reference: /cinemorph reference add <path> --name <name>');
}

if (require.main === module) {
  installHook();
}

module.exports = { installHook };
