// R008.AC1 + R008.AC2 + R008.AC3: tokens.ts exposes the full THEME contract
// every deck must satisfy. These tests pin the shape (every required key
// present) and the value formats (hex colors, rem-string radii, css-string
// shadows). The per-deck merger (T014) overwrites the *values* at scaffold
// time, so we validate format, not specific colors.

import { describe, it, expect } from 'vitest';
import { THEME, type Theme } from '../tokens';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const REM_RE = /^[0-9.]+rem$/;

describe('tokens.ts THEME contract (R008)', () => {
  describe('R008.AC1 — color tokens are hex strings', () => {
    const colorKeys = [
      'background',
      'foreground',
      'mutedForeground',
      'border',
      'surfaceBase',
      'surfaceSubtle',
      'surfaceRaised',
      'success',
      'info',
      'warning',
      'destructive'
    ] as const;

    it.each(colorKeys)('THEME.%s is a 6-digit hex color', (key) => {
      const value = THEME[key];
      expect(typeof value).toBe('string');
      expect(value).toMatch(HEX_RE);
    });
  });

  describe('R008.AC2 — font tokens are non-empty strings', () => {
    it('exports fontDisplay, fontBody, fontMono', () => {
      expect(typeof THEME.fontDisplay).toBe('string');
      expect(THEME.fontDisplay.length).toBeGreaterThan(0);
      expect(typeof THEME.fontBody).toBe('string');
      expect(THEME.fontBody.length).toBeGreaterThan(0);
      expect(typeof THEME.fontMono).toBe('string');
      expect(THEME.fontMono.length).toBeGreaterThan(0);
    });
  });

  describe('R008.AC3 — radius / shadow / spacing scales', () => {
    it('radius scale exports sm/md/lg/xl as rem strings', () => {
      expect(THEME.radiusSm).toMatch(REM_RE);
      expect(THEME.radiusMd).toMatch(REM_RE);
      expect(THEME.radiusLg).toMatch(REM_RE);
      expect(THEME.radiusXl).toMatch(REM_RE);
    });

    it('shadow tokens are non-empty CSS box-shadow strings', () => {
      expect(typeof THEME.shadowSm).toBe('string');
      expect(THEME.shadowSm.length).toBeGreaterThan(0);
      expect(typeof THEME.shadowMd).toBe('string');
      expect(THEME.shadowMd.length).toBeGreaterThan(0);
      expect(typeof THEME.shadowLg).toBe('string');
      expect(THEME.shadowLg.length).toBeGreaterThan(0);
    });

    it('spacing scale matches Tailwind 4-unit defaults (0, 1, 2, 4, 8 ...)', () => {
      // Tailwind's scale: each integer step = 0.25rem.
      expect(THEME.spacing[0]).toBe('0rem');
      expect(THEME.spacing[1]).toBe('0.25rem');
      expect(THEME.spacing[2]).toBe('0.5rem');
      expect(THEME.spacing[4]).toBe('1rem');
      expect(THEME.spacing[8]).toBe('2rem');
      // Spot-check that every value is a rem string.
      for (const v of Object.values(THEME.spacing)) {
        expect(v).toMatch(REM_RE);
      }
    });
  });

  describe('connectorPalette — 10 brand colors', () => {
    const connectors = [
      'drive',
      'slack',
      'github',
      'notion',
      'onedrive',
      'salesforce',
      'jira',
      'confluence',
      'teams',
      'linear'
    ] as const;

    it.each(connectors)('connectorPalette.%s is a hex color', (key) => {
      const value = THEME.connectorPalette[key];
      expect(typeof value).toBe('string');
      expect(value).toMatch(HEX_RE);
    });

    it('Drive blue, Slack yellow, GitHub light-grey match the locked spec', () => {
      expect(THEME.connectorPalette.drive).toBe('#4285F4');
      expect(THEME.connectorPalette.slack).toBe('#ECB22E');
      expect(THEME.connectorPalette.github).toBe('#C9D1D9');
      expect(THEME.connectorPalette.linear).toBe('#5E6AD2');
    });
  });

  it('exports a Theme type alias derived from THEME (compile-time check)', () => {
    // If `Theme` ever loses sync with `typeof THEME` this assignment fails
    // type-checking and `tsc --noEmit` (run separately) catches it.
    const sample: Theme = THEME;
    expect(sample).toBe(THEME);
  });
});
