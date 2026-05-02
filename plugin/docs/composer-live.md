# Composer Live: API Wiring

## Overview

The Morph Deck composer is an agentic Claude invocation that generates complete `stages.ts` + `data.ts` TypeScript files from a brief, design tokens, and primitive manifest.

The composer runs locally via the `claude` CLI binary on PATH. The CLI authenticates with your Claude Code subscription, invokes Claude with a system prompt, and parses the JSON output. No API key environment variable is required.

## Authentication

The composer relies on the `claude` CLI being on PATH and already authenticated against your Claude Code subscription. If you can run `claude` from a terminal in this session, the composer will work.

### Verify the Setup

```bash
claude --version
```

If the command is not found, install Claude Code from https://claude.com/claude-code and sign in. Once `claude --version` returns without error, no further auth setup is needed.

### Stub Mode (Tests Only)

For tests, swap in a deterministic stub binary via the `MORPH_DECK_FAKE_CLAUDE` env var:

```bash
MORPH_DECK_FAKE_CLAUDE=/path/to/stub.js node --test plugin/scripts/__tests__/composer.test.cjs
```

This is the only env-var path the composer reads. There is no `ANTHROPIC_API_KEY` flow.

## How the Composer Works

When you run `/morph-deck new --prompt "..."`, here is what happens:

1. **Brief parsing**: Extract the plain-text brief from the command
2. **Token resolution**: Load the theme JSON (or merge theme + override tokens)
3. **Primitive manifest**: Build a list of available elements from `primitives/`
4. **Message building**: Construct a user message with brief, tokens, manifest
5. **System prompt**: Load `agents/morph-composer.md`
6. **CLI invocation**: Spawn `claude` binary via `child_process.spawnSync()`:
   ```bash
   claude \
     -p "## Brief\n..." \
     --system-prompt "# Morph Deck Composer\n..." \
     --output-format text \
     --model claude-sonnet-4-6
   ```
7. **Output parsing**: Extract JSON from stdout; validate `stagesTs` and `dataTs`
8. **File write**: Save to `{deckPath}/src/deck/stages.ts` and `data.ts`

## Implementation Details

The orchestration happens in `scripts/composer.cjs`:

```javascript
const { composeDeck } = require('./scripts/composer.cjs');

const result = await composeDeck({
  brief: 'Series A pitch for Stacklink',
  tokens: { background: '#ffffff', ... },
  deckPath: '/path/to/deck',
  clarifications: '',       // optional refinement text
  dslDraft: '',            // optional starting-point stages.ts
  model: 'claude-sonnet-4-6' // override model if needed
});

// Returns:
// {
//   stagesTs: "import type { StageConfig } from './stages';\nexport const STAGES: ...",
//   dataTs: "export default { ... };",
//   stagesJson: "{\"source\": \"...\"}",
//   dataJson: "{\"source\": \"...\"}",
//   model: "claude-sonnet-4-6",
//   tokensUsed: null
// }
//
// Or on error:
// { error: 'budget' | 'timeout' | 'parse' | 'validation', message: "..." }
```

### Key Functions

**`buildUserMessage(brief, tokens, manifest, clarifications, dslDraft)`**

Constructs the LLM user message:

```markdown
## Brief
[brief text]

## Design Tokens
```json
[tokens JSON]
```

## Primitive Manifest
```json
[manifest array]
```

## Instruction
Emit a single JSON object with fields "stagesTs" and "dataTs"...
```

**`extractJson(raw)`**

Strips markdown fences and extracts the first `{...}` JSON object from LLM output. Handles:
- `` ```json\n{...}\n``` ``
- Plain `{...}` with surrounding prose
- Escapes within the JSON

**`validateOutput(stagesTs, dataTs)`**

Checks:
- Both strings are non-empty
- `stagesTs` contains `STAGES` export
- `dataTs` contains `export default`

## Testing with a Fake Claude Binary

For testing without an API key, set `MORPH_DECK_FAKE_CLAUDE`:

```bash
export MORPH_DECK_FAKE_CLAUDE=/path/to/stub-claude
/morph-deck new --prompt "test deck"
```

The stub binary should:
1. Read args (ignores them for testing)
2. Print a JSON object with `stagesTs` and `dataTs` fields
3. Exit with code 0

Example stub (Node.js):

```javascript
// stub-claude.cjs
const output = JSON.stringify({
  stagesTs: 'import type { StageConfig } from "./stages";\nexport const STAGES: StageConfig[] = [{id:1,name:"Test",caption:{eyebrow:"Test",headline:"Test"},talkTrack:{script:"Test"},elements:{}}];',
  dataTs: 'export default {};'
});
console.log(output);
process.exit(0);
```

Run it as:

```bash
export MORPH_DECK_FAKE_CLAUDE=/path/to/stub-claude.cjs
/morph-deck new --prompt "test"
```

## Constraints & Budgets

- **Max output tokens**: 8000 (enforced by the composer)
- **Max wall time**: 60 seconds (SIGTERM on timeout)
- **Recommended deck size**: 3–7 main slides + 0–3 backup slides

For longer decks or very detailed talk tracks, the composer may hit token limits. If this happens:

1. Reduce the brief length (be more concise)
2. Lower the number of slides (consolidate stages)
3. Use shorter talk-track scripts
4. Invoke with `--model claude-opus-4-6` for higher limits (if available)

## Model Selection

Default: `claude-sonnet-4-6`

Override with `--model` flag:

```bash
/morph-deck new --model claude-opus-4-6 --prompt "..."
```

Available models (consult https://docs.anthropic.com/ for latest):
- `claude-sonnet-4-6` (fast, 8k output token limit)
- `claude-opus-4-6` (high reasoning, higher limits)

## Example: Full Workflow

```bash
# 1. Verify claude CLI is on PATH and signed in (one-time setup)
claude --version

# 2. Create a new deck from a brief
/morph-deck new \
  --theme stacklink-dark \
  --prompt "Investor pitch: problem (fragmented knowledge), solution (Stacklink unified search), traction (10k users), team (ex-Elastic), ask (Series A 8M)" \
  --out ./investor-pitch

# 3. The composer runs, generates stages.ts + data.ts
# Composer output:
#   {
#     "stagesTs": "import type { StageConfig } from './stages';\n\nexport const STAGES: StageConfig[] = [...",
#     "dataTs": "export default { wordmark: { text: 'Stacklink' }, ... };"
#   }

# 4. Files are written to:
#   investor-pitch/src/deck/stages.ts
#   investor-pitch/src/deck/data.ts

# 5. Live preview
/morph-deck render --deck ./investor-pitch
# Opens http://localhost:5173
```

## Troubleshooting

**Q: `claude` command not found**

A: Install Claude Code from https://claude.com/claude-code and sign in. Then `claude --version` should work.

**Q: Composer fails with an auth error**

A: Run `claude --version` interactively to confirm you are signed in to your Claude Code subscription. The composer inherits whatever credentials the CLI has.

**Q: Composer times out (60 seconds)**

A: The brief may be too long or the request too complex. Try:
- Reducing the brief to essential points only
- Splitting the pitch into fewer slides
- Using the `--model` flag with a higher-capacity model

**Q: JSON parse error**

A: The LLM output did not contain a valid JSON object. Check:
- Is the `claude` CLI version current?
- Try running again (transient issue)

**Q: "stagesTs does not contain STAGES export"**

A: The LLM output did not include the expected TypeScript export. The system prompt may have been ignored. Verify:
- `agents/morph-composer.md` exists and is readable
- Try a simpler brief (e.g., "3-slide deck: intro, feature, call to action")

## Advanced: Custom Composer Invocations

If you need to call the composer directly from Node.js:

```javascript
const { composeDeck } = require('./plugin/scripts/composer.cjs');

(async () => {
  const result = await composeDeck({
    brief: 'Q1 roadmap: infrastructure, AI features, mobile apps',
    tokens: require('./plugin/themes/linear-light.json'),
    deckPath: '/absolute/path/to/new-deck',
    model: 'claude-sonnet-4-6'
  });

  if (result.error) {
    console.error('Composer error:', result.error, result.message);
  } else {
    console.log('Generated stages.ts and data.ts');
    console.log('Model used:', result.model);
  }
})();
```

For testing, pass `_fakeClaudeBin`:

```javascript
const result = await composeDeck({
  brief: '...',
  tokens: {...},
  deckPath: '...',
  _fakeClaudeBin: '/path/to/stub-claude.cjs'
});
```
