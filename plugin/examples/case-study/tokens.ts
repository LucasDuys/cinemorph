// Theme: minimal-mono. Monospace body with strong contrast.
export const THEME = {
  background: "#FFFFFF",
  foreground: "#000000",
  mutedForeground: "#404040",
  border: "#D0D0D0",
  surfaceBase: "#FFFFFF",
  surfaceSubtle: "#F5F5F5",
  surfaceRaised: "#FFFFFF",
  success: "#00AA00",
  info: "#0000AA",
  warning: "#AA5500",
  destructive: "#AA0000",
  fontDisplay: '"IBM Plex Mono", monospace',
  fontBody: '"IBM Plex Mono", monospace',
  fontMono: '"IBM Plex Mono", monospace',
  radiusSm: "0rem",
  radiusMd: "0rem",
  radiusLg: "0rem",
  radiusXl: "0rem",
  shadowSm: "none",
  shadowMd: "0 2px 4px rgba(0,0,0,0.1)",
  shadowLg: "0 4px 8px rgba(0,0,0,0.15)",
  spacing: { 0: "0rem", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem", 20: "5rem", 24: "6rem", 32: "8rem" },
  connectorPalette: { drive: "#000000", slack: "#000000", github: "#000000", notion: "#000000", onedrive: "#000000", salesforce: "#000000", jira: "#000000", confluence: "#000000", teams: "#000000", linear: "#000000" }
} as const;

export type Theme = typeof THEME;
