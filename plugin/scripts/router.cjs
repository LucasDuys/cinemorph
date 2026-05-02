#!/usr/bin/env node
'use strict';

// Morph-Deck subcommand router. No deps. Parses argv and dispatches.

const SUBCOMMANDS = {
  new: {
    summary: 'Scaffold a fresh deck',
    stub: 'not yet implemented -- see T015 (composer harness) in spec-morph-deck-core.md',
  },
  iterate: {
    summary: 'Regenerate or refine slides in an existing deck',
    stub: 'not yet implemented -- see T017 in spec-morph-deck-core.md',
  },
  render: {
    summary: 'Start the dev server / live preview for a deck',
    stub: 'not yet implemented -- see T020 (run `bun run dev` in deck dir) in spec-morph-deck-core.md',
  },
  pptx: {
    summary: 'Export deck to PowerPoint (.pptx)',
    stub: 'not yet implemented -- see spec-morph-deck-outputs.md R001-R006',
  },
  video: {
    summary: 'Export deck to MP4 / launch-video format',
    stub: 'not yet implemented -- see spec-morph-deck-outputs.md R007-R010',
  },
  export: {
    summary: 'Bundle a deck for sharing',
    stub: 'not yet implemented -- see spec-morph-deck-outputs.md R013',
  },
  qa: {
    summary: 'Run vision-QA self-loop on a generated deck',
    stub: 'not yet implemented -- see spec-morph-deck-verifier.md R002',
  },
  compare: {
    summary: 'Compare a new deck against a reference deck or registered name',
    stub: 'not yet implemented -- see spec-morph-deck-verifier.md R005',
  },
  reference: {
    summary: 'Manage reference deck registry',
    stub: 'not yet implemented -- see spec-morph-deck-verifier.md R006',
  },
};

const COMMON_FLAGS_HELP = [
  '  --theme <name>         pick a token theme (e.g. stacklink-dark)',
  '  --tokens <path>        override theme with a token JSON file',
  '  --reference <image>    visual reference image to anchor the look',
  '  --prompt "<text>"      brief / story text driving slide generation',
  '  --out <path>           output directory or file path',
  '  --deck <path>          existing deck directory',
  '  --from-example <name>  start from a bundled example deck',
  '  --no-qa                skip vision-QA (manual review only)',
];

const FLAG_KEYS = ['theme', 'tokens', 'reference', 'prompt', 'out', 'deck', 'from-example', 'no-qa'];

function printTopHelp(stream) {
  stream.write('morph-deck -- generate launch-video-style React presentations with shared-layout (FLIP) morph transitions.\n\n');
  stream.write('Usage: morph-deck <subcommand> [flags]\n\n');
  stream.write('Subcommands:\n');
  for (const name of Object.keys(SUBCOMMANDS)) {
    stream.write('  ' + name.padEnd(10) + ' ' + SUBCOMMANDS[name].summary + '\n');
  }
  stream.write('\nRun `morph-deck <subcommand> --help` for per-subcommand usage.\n');
  stream.write('\nCommon flags:\n');
  for (const line of COMMON_FLAGS_HELP) stream.write(line + '\n');
}

function printSubHelp(name, stream) {
  const sub = SUBCOMMANDS[name];
  stream.write('morph-deck ' + name + ' -- ' + sub.summary + '\n\n');
  stream.write('Usage: morph-deck ' + name + ' [flags]\n\n');
  stream.write('Flags:\n');
  for (const line of COMMON_FLAGS_HELP) stream.write(line + '\n');

  // Subcommand-specific flags
  if (name === 'qa') {
    stream.write('  --main-only            skip backup stages\n');
  } else if (name === 'compare') {
    stream.write('  --against <name-or-path> reference deck to compare against\n');
    stream.write('  --auto-improve         iteratively improve new deck\n');
  } else if (name === 'reference') {
    stream.write('\nSub-actions:\n');
    stream.write('  add <path> --as <name> register a reference deck\n');
    stream.write('  list                   list all registered references\n');
  }

  stream.write('\nExamples:\n');
  if (name === 'new') {
    stream.write('  morph-deck new --theme stacklink-dark --prompt "Series A pitch for Stacklink"\n');
    stream.write('  morph-deck new --from-example launch-video --out ./my-deck\n');
  } else if (name === 'iterate') {
    stream.write('  morph-deck iterate --deck ./my-deck --prompt "make slide 3 more cinematic"\n');
  } else if (name === 'render') {
    stream.write('  morph-deck render --deck ./my-deck\n');
  } else if (name === 'pptx') {
    stream.write('  morph-deck pptx --deck ./my-deck --out ./my-deck.pptx\n');
  } else if (name === 'video') {
    stream.write('  morph-deck video --deck ./my-deck --out ./my-deck.mp4\n');
  } else if (name === 'export') {
    stream.write('  morph-deck export --deck ./my-deck --out ./my-deck.zip\n');
  } else if (name === 'qa') {
    stream.write('  morph-deck qa --deck ./my-deck\n');
    stream.write('  morph-deck qa --deck ./my-deck --no-qa\n');
  } else if (name === 'compare') {
    stream.write('  morph-deck compare --deck ./my-deck --against stacklink-roundone-2026-04\n');
    stream.write('  morph-deck compare --deck ./my-deck --against ./ref-deck --auto-improve\n');
  } else if (name === 'reference') {
    stream.write('  morph-deck reference list\n');
    stream.write('  morph-deck reference add ./path/to/deck --as my-reference\n');
  }

  stream.write('\nStatus: ' + sub.stub + '\n');
}

function parseFlags(argv) {
  // Minimal arg-walk parser. Returns { flags: {...}, positional: [...], errors: [...] }.
  // Boolean flags (--no-qa) don't require values; others do.
  const BOOLEAN_FLAGS = ['no-qa'];
  const flags = {};
  const positional = [];
  const errors = [];
  let i = 0;
  while (i < argv.length) {
    const tok = argv[i];
    if (tok === '--help' || tok === '-h') {
      flags.help = true;
      i += 1;
      continue;
    }
    if (tok.startsWith('--')) {
      const key = tok.slice(2);
      if (!FLAG_KEYS.includes(key)) {
        errors.push('unknown flag: --' + key);
        i += 1;
        continue;
      }
      if (BOOLEAN_FLAGS.includes(key)) {
        flags[key] = true;
        i += 1;
        continue;
      }
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        errors.push('flag --' + key + ' requires a value');
        i += 1;
        continue;
      }
      flags[key] = next;
      i += 2;
      continue;
    }
    positional.push(tok);
    i += 1;
  }
  return { flags: flags, positional: positional, errors: errors };
}

function main(argv) {
  const args = argv.slice(2);

  // Top-level help: no args, or first token is --help/-h.
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printTopHelp(process.stdout);
    return 0;
  }

  const sub = args[0];
  if (!Object.prototype.hasOwnProperty.call(SUBCOMMANDS, sub)) {
    process.stderr.write('unknown subcommand: ' + sub + '\n');
    process.stderr.write('Run `morph-deck --help` for the list of subcommands.\n');
    return 2;
  }

  const rest = args.slice(1);
  const parsed = parseFlags(rest);

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) process.stderr.write(err + '\n');
    return 2;
  }

  if (parsed.flags.help) {
    printSubHelp(sub, process.stdout);
    return 0;
  }

  if (process.env.MORPH_DECK_DEBUG_FLAGS === '1') {
    process.stdout.write(JSON.stringify({ subcommand: sub, flags: parsed.flags, positional: parsed.positional }) + '\n');
    return 0;
  }

  process.stdout.write('morph-deck ' + sub + ': ' + SUBCOMMANDS[sub].stub + '\n');
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { main: main, parseFlags: parseFlags, SUBCOMMANDS: SUBCOMMANDS };
