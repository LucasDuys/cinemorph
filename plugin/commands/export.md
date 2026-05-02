# `/morph-deck export` — Combined Export Orchestrator

Export a pitch deck to PPTX, video, and/or speaker notes in one command.

## Signature

```
/morph-deck export [--all] [--pptx] [--video] [--notes] [--skip <list>] [--deck <path>]
```

## Modes

### `--all` (default)
Export to all three formats: PPTX, video (WebM/MP4), and speaker notes (Markdown).

### Individual format flags
- `--pptx` — Export to PowerPoint presentation only
- `--video` — Record video only
- `--notes` — Export speaker notes Markdown only

## Options

### `--skip <list>`
Skip one or more pipelines. Comma-separated list of: `pptx`, `video`, `notes`.

Example: `--skip pptx,video` (export notes only)

### `--deck <path>`
Path to deck directory (default: current working directory).

Example: `--deck C:/dev/my-deck/`

## Exit Codes

- `0` — All enabled pipelines succeeded
- `1` — One or more pipelines failed
- `2` — All enabled pipelines were skipped (no work done)

## Output

Each pipeline prints:
- `[pipeline] starting...` — Begin processing
- `[pipeline] ok (Ns)` — Success with elapsed time
- `[pipeline] failed (Ns): <error>` — Failure with error message
- `[pipeline] skipped` — Skipped via `--skip`

Final summary table shows all pipeline statuses.

## Examples

```bash
# Export all three formats
/morph-deck export --all --deck ./my-deck

# PPTX and video only, skip notes
/morph-deck export --skip notes --deck ./my-deck

# Video only
/morph-deck export --video --deck ./my-deck

# Export with custom output directory for PPTX
/morph-deck export --all --deck ./my-deck --out-dir ./custom-dist

# Notes only
/morph-deck export --notes
```

## Spec Ref

Implements R013 from spec-morph-deck-outputs.md:
- R013.AC1 — `--all` flag orchestrates all three pipelines
- R013.AC2 — `--skip` filter skips listed pipelines
- R013.AC3 — Partial-failure status report printed to console
- R013.AC4 — Exit codes: 0 (success), 1 (failure), 2 (all skipped)
