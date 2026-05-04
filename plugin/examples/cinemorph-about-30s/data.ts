// Cinemorph about 30s — text content shown on canvas.
// Each scene's caption + on-screen copy lives here; stages.ts references
// these by id. Edit copy here without touching layout.

export const DATA = {
  product: {
    name:    'Cinemorph',
    tagline: 'a Claude Code plugin',
    url:     'lucasduys.github.io/cinemorph',
    install: 'cp -r plugin ~/.claude/plugins/cinemorph'
  },

  // Scene captions (S1 → S7)
  captions: {
    hook:     'decks that morph.',
    brief:    'it starts with a brief.',
    composer: 'the composer writes stages.ts and data.ts.',
    morph:    'FLIP morphs. no keyframes.',
    outputs:  'live deck · MP4 · PowerPoint Morph.',
    examples: 'twelve starters. yours next.',
    outro:    null   // outro caption is rendered as wordmark + tagline pair
  },

  // S1 — primitive labels orbiting the wordmark.
  // These are real primitives the engine knows how to render
  // (see plugin/primitives/). They show what Cinemorph composes.
  primitives: [
    { id: 'wordmark', label: 'wordmark', accent: true  },
    { id: 'kpi',      label: 'kpi',      accent: false },
    { id: 'orbit',    label: 'orbit',    accent: false },
    { id: 'pipeline', label: 'pipeline', accent: false },
    { id: 'card',     label: 'card',     accent: false }
  ],

  // S2 — typed prompt. Generic-enough that it works for any user;
  // intentionally avoids any specific product or vertical.
  brief: {
    command:  '/cinemorph new --prompt',
    text:     '30-second cinematic launch film for our new product',
    typingMs: 3400   // matches SFX TYPING window (4200ms → 7600ms)
  },

  // S3 — composer-generated stages.ts snippet (5 lines max for legibility).
  // Shows two FLIP-tracked positions of the same wordmark id; this is
  // the entire surface area of the morph engine in one screenful.
  stagesTsSample: [
    "export const STAGES = [",
    "  { id: 'hook',   wordmark: { left: '50%', top: '50%' } },",
    "  { id: 'reveal', wordmark: { left: '50%', top: '14%' } },",
    "  { id: 'outro',  wordmark: { left: '50%', top: '50%' } },",
    "];"
  ].join('\n'),

  // S4 — same primitives as S1, now lined up across the middle.
  // Visual: identical ids, different positions → automatic FLIP morph.

  // S5 — three production targets.
  outputs: [
    {
      id:    'live',
      tag:   'LIVE DECK',
      title: 'Vite + React',
      sub:   'localhost:5173 · hot reload · ?dev=1 scrubber'
    },
    {
      id:    'mp4',
      tag:   'MP4',
      title: 'Playwright + ffmpeg',
      sub:   '30 s film · audio bus · smear cuts · aeBounce'
    },
    {
      id:    'pptx',
      tag:   'PPTX',
      title: 'Native Microsoft Morph',
      sub:   'editable handoff · Office 2019+ · 365'
    }
  ],

  // S6 — eight representative example tiles (out of twelve total).
  examples: [
    { id: 'launch',    label: 'launch-cinematic-30s',     accent: true },
    { id: 'stacklink', label: 'stacklink-roundone-pitch'              },
    { id: 'pitch5',    label: 'pitch-5slide'                          },
    { id: 'feature',   label: 'feature-demo'                          },
    { id: 'kpi',       label: 'kpi-dashboard-tour'                    },
    { id: 'case',      label: 'case-study'                            },
    { id: 'manifest',  label: 'manifesto'                             },
    { id: 'team',      label: 'team-intro'                            }
  ]
} as const;

export type DataShape = typeof DATA;
