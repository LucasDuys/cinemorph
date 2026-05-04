// Theme: Aperture — cream paper, deep ink, vermillion + chrome yellow.
// Cinema-flavoured counterpart to stacklink-dark. Inspired by Letterboxd,
// A24, Kodak film leader. Used by the cinemorph-about-30s film and by the
// Cinemorph GitHub Pages site (which is the same artefact rendered in CSS).
export const THEME = {
  background:        '#F4EFE3',  // warm cream paper
  foreground:        '#14110D',  // deep ink
  mutedForeground:   '#6B655C',  // warm gray
  border:            '#DCD3BD',  // soft cream rule
  surfaceBase:       '#F4EFE3',
  surfaceSubtle:     '#FAF7EE',  // lighter paper
  surfaceRaised:     '#ECE4CF',  // deeper paper (cards)
  success:           '#1F5C3A',  // deep moss
  info:              '#0F4C81',  // deep teal-blue
  warning:           '#FFC93C',  // chrome yellow (film leader)
  destructive:       '#D03012',  // vermillion-deep
  fontDisplay:       '"Fraunces", "Cooper Hewitt", "Source Serif Pro", Georgia, serif',
  fontBody:          '"Inter", system-ui, sans-serif',
  fontMono:          '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
  radiusSm:          '6px',
  radiusMd:          '10px',
  radiusLg:          '16px',
  radiusXl:          '22px',
  shadowSm:          '0 1px 0 rgba(20,17,13,0.04), 0 1px 2px rgba(20,17,13,0.06)',
  shadowMd:          '0 8px 22px -10px rgba(20,17,13,0.18)',
  shadowLg:          '0 30px 60px -28px rgba(20,17,13,0.30), 0 6px 18px -10px rgba(255,77,46,0.18)',
  spacing: {
    0: '0rem', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.25rem',
    6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem', 16: '4rem', 20: '5rem',
    24: '6rem', 32: '8rem'
  },
  connectorPalette: {
    drive:      '#1A6FE0',
    slack:      '#B8861E',
    github:     '#14110D',
    notion:     '#14110D',
    onedrive:   '#0F4C81',
    salesforce: '#00A1E0',
    jira:       '#0052CC',
    confluence: '#172B4D',
    teams:      '#5059C9',
    linear:     '#4F49B5'
  },
  // Aperture-specific accents. The composer reads these for the gradient
  // sweep on the wordmark and the chrome-yellow code-card head.
  accent: {
    vermillion:     '#FF4D2E',
    vermillionDeep: '#D03012',
    chrome:         '#FFC93C',
    teal:           '#0F4C81',
    moss:           '#1F5C3A'
  }
} as const;

export type Theme = typeof THEME;
