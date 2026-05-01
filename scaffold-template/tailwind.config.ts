import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        mutedForeground: 'var(--muted-foreground)',
        border: 'var(--border)',
        surfaceBase: 'var(--surface-base)',
        surfaceSubtle: 'var(--surface-subtle)',
        surfaceRaised: 'var(--surface-raised)',
        success: 'var(--success)',
        info: 'var(--info)',
        warning: 'var(--warning)',
        destructive: 'var(--destructive)'
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)'
      }
    }
  },
  plugins: []
};

export default config;
