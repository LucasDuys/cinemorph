// Theme: playful-poster. Bright, colorful, playful palette.
export const THEME = {
  background: "#FFF9E6",
  foreground: "#1A1A1A",
  mutedForeground: "#666666",
  border: "#FFD700",
  surfaceBase: "#FFFAEC",
  surfaceSubtle: "#FFF5DB",
  surfaceRaised: "#FFFAEC",
  success: "#00CC00",
  info: "#0066FF",
  warning: "#FF6B00",
  destructive: "#FF0000",
  fontDisplay: '"Fredoka", sans-serif',
  fontBody: '"Fredoka", sans-serif',
  fontMono: '"Courier New", monospace',
  radiusSm: "0.5rem",
  radiusMd: "0.75rem",
  radiusLg: "1rem",
  radiusXl: "1.5rem",
  shadowSm: "0 2px 4px rgba(255,128,0,0.2)",
  shadowMd: "0 4px 8px rgba(255,128,0,0.25)",
  shadowLg: "0 8px 16px rgba(255,128,0,0.3)",
  spacing: { 0: "0rem", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem", 20: "5rem", 24: "6rem", 32: "8rem" },
  connectorPalette: { drive: "#FF6B35", slack: "#FF006E", github: "#00B4D8", notion: "#FFB703", onedrive: "#FB5607", salesforce: "#FFBE0B", jira: "#8338EC", confluence: "#3A86FF", teams: "#06FFA5", linear: "#FF006E" }
} as const;

export type Theme = typeof THEME;
