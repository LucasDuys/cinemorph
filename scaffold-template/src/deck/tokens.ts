// Design token contract for a morph-deck deck.
// Default values are placeholders matching the `stacklink-dark` theme; the
// per-deck merger (see T014: --theme/--tokens/--reference/--prompt resolution)
// overwrites these at scaffold time so generated decks ship with the user's
// chosen palette baked in.
//
// Spec: R008.AC1 (color tokens as hex), R008.AC2 (font tokens), R008.AC3
// (radius/shadow/spacing scales matching Tailwind defaults but overridable).

export const THEME = {
  // --- Color tokens (R008.AC1) ---------------------------------------------
  background: '#0A0E1A',
  foreground: '#F5F7FA',
  mutedForeground: '#8A93A6',
  border: '#1F2937',
  surfaceBase: '#0F1420',
  surfaceSubtle: '#151A28',
  surfaceRaised: '#1C2333',
  success: '#10B981',
  info: '#3B82F6',
  warning: '#F59E0B',
  destructive: '#EF4444',

  // --- Font tokens (R008.AC2) ----------------------------------------------
  fontDisplay: '"Inter", "Helvetica Neue", system-ui, sans-serif',
  fontBody: '"Inter", "Helvetica Neue", system-ui, sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',

  // --- Radius scale (R008.AC3) ---------------------------------------------
  radiusSm: '0.25rem',
  radiusMd: '0.5rem',
  radiusLg: '0.75rem',
  radiusXl: '1rem',

  // --- Shadow tokens (R008.AC3) --------------------------------------------
  shadowSm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  shadowMd: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

  // --- Spacing scale (R008.AC3) --------------------------------------------
  // Matches Tailwind's default 4px-based scale. Each step is `step * 0.25rem`.
  // Overridable per theme; consumers should reference these keys rather than
  // hardcoding rem/px values.
  spacing: {
    0: '0rem',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem'
  },

  // --- Connector palette (R008.AC6) ----------------------------------------
  // Brand colors for the 10 first-class connector chips. Used by
  // ConnectorChip.tsx to drive logo tinting and orbit accents.
  connectorPalette: {
    drive: '#4285F4',
    slack: '#ECB22E',
    github: '#C9D1D9',
    notion: '#FFFFFF',
    onedrive: '#28A8EA',
    salesforce: '#00A1E0',
    jira: '#0052CC',
    confluence: '#172B4D',
    teams: '#5059C9',
    linear: '#5E6AD2'
  }
} as const;

// Public type so consumers (primitives, frames, the per-deck merger) can
// type-check that overrides supply every required field.
export type Theme = typeof THEME;
