export const THEME = {
  background: "#FFFFFF",
  foreground: "#0A0A0F",
  mutedForeground: "#6E6E80",
  border: "#E6E6EB",
  surfaceBase: "#FFFFFF",
  surfaceSubtle: "#F4F4F7",
  surfaceRaised: "#FFFFFF",
  success: "#16A34A",
  info: "#5E6AD2",
  warning: "#D97706",
  destructive: "#DC2626",
  fontDisplay: "'Inter Display', Inter, sans-serif",
  fontBody: "Inter, sans-serif",
  fontMono: "'Berkeley Mono', JetBrains Mono, ui-monospace, monospace",
  radiusSm: "0.25rem",
  radiusMd: "0.375rem",
  radiusLg: "0.5rem",
  radiusXl: "0.75rem",
  shadowSm: "0 1px 2px rgb(10 10 15 / 0.04)",
  shadowMd: "0 4px 6px rgb(10 10 15 / 0.06)",
  shadowLg: "0 12px 24px rgb(10 10 15 / 0.08)",
  spacing: { 0: "0rem", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 8: "2rem", 10: "2.5rem", 12: "3rem", 16: "4rem", 20: "5rem", 24: "6rem", 32: "8rem" },
  connectorPalette: { drive: "#4285F4", slack: "#611F69", github: "#181717", notion: "#000000", onedrive: "#0078D4", salesforce: "#00A1E0", jira: "#0052CC", confluence: "#172B4D", teams: "#464EB8", linear: "#5E6AD2" }
} as const;

export type Theme = typeof THEME;
