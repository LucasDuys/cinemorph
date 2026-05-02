// Theme: bunq-mint-light. Fresh mint green with friendly feel.
export const THEME = {
  background: "#FFFFFF",
  foreground: "#0B1B28",
  mutedForeground: "#7E8A99",
  border: "#E0E5EB",
  surfaceBase: "#FFFFFF",
  surfaceSubtle: "#F7FAFB",
  surfaceRaised: "#FFFFFF",
  success: "#00D084",
  info: "#0066FF",
  warning: "#FFB500",
  destructive: "#FF3B30",
  fontDisplay: '"Montserrat", sans-serif',
  fontBody: '"Open Sans", sans-serif',
  fontMono: '"Roboto Mono", monospace',
  radiusSm: "0.25rem",
  radiusMd: "0.5rem",
  radiusLg: "0.75rem",
  radiusXl: "1rem",
  shadowSm: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.1)",
  shadowLg: "0 8px 24px rgba(0,0,0,0.12)",
  spacing: { 0: "0rem", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem", 20: "5rem", 24: "6rem", 32: "8rem" },
  connectorPalette: { drive: "#4285F4", slack: "#E01E5A", github: "#181717", notion: "#000000", onedrive: "#0078D4", salesforce: "#00A1E0", jira: "#0052CC", confluence: "#172B4D", teams: "#6264A7", linear: "#5E6AD2" }
} as const;

export type Theme = typeof THEME;
