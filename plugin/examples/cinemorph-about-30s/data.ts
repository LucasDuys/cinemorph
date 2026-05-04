// Cinemorph about 30s — text content shown on canvas.
// Each scene's caption + on-screen copy lives here; stages.ts references
// these by id. Edit copy here without touching layout.

export const DATA = {
  product: {
    name: 'Cinemorph',
    tagline: 'a Claude Code plugin',
    url:     'lucasduys.github.io/cinemorph',
    install: 'cp -r plugin ~/.claude/plugins/cinemorph'
  },

  // Scene captions (S1 → S7)
  captions: {
    hook:     'your stack already knows everything.',
    brief:    'give it a brief.',
    composer: 'the composer writes the deck.',
    morph:    'elements morph between stages.',
    outputs:  'three outputs. one source of truth.',
    examples: 'twelve starters. yours next.',
    outro:    null   // outro caption is rendered as wordmark + tagline pair
  },

  // S2 — typed prompt
  brief: {
    command: '/cinemorph new --prompt',
    text:    'Series A pitch: problem, solution, traction, team, ask',
    typingMs: 3400   // matches SFX TYPING window (4200ms → 7600ms)
  },

  // S3 — composer-generated stages.ts snippet (5 lines max for legibility)
  stagesTsSample: [
    "export const STAGES = [",
    "  { id: 'hook',   wordmark: { left: '50%', top: '50%' } },",
    "  { id: 'reveal', wordmark: { left: '50%', top: '14%' } },",
    "  { id: 'outro',  wordmark: { left: '50%', top: '50%' } },",
    "];"
  ].join('\n'),

  // S4 — connector chips that line up at scene 4
  connectors: [
    { id: 'slack',  label: 'slack' },
    { id: 'github', label: 'github' },
    { id: 'notion', label: 'notion' },
    { id: 'linear', label: 'linear' },
    { id: 'drive',  label: 'drive' }
  ],

  // S5 — three output cards
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

  // S6 — eight representative example tiles (out of twelve total)
  examples: [
    { id: 'launch',   label: 'launch-cinematic-30s',     accent: true },
    { id: 'stacklink',label: 'stacklink-roundone-pitch'              },
    { id: 'pitch5',   label: 'pitch-5slide'                          },
    { id: 'feature',  label: 'feature-demo'                          },
    { id: 'kpi',      label: 'kpi-dashboard-tour'                    },
    { id: 'case',     label: 'case-study'                            },
    { id: 'manifest', label: 'manifesto'                             },
    { id: 'team',     label: 'team-intro'                            }
  ]
} as const;

export type DataShape = typeof DATA;
