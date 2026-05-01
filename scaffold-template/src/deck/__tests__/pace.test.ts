// R006.AC1 + R006.AC2: pace.ts is the single source of truth for animation
// timing. These tests pin the exported names and exact default values so any
// drift trips CI before it reaches a deck.

import { describe, it, expect } from 'vitest';
import {
  MORPH_EASE,
  MORPH_TRANSITION,
  CAPTION_FADE,
  FRAME_FADE,
  FRAME_FADE_OUT,
  PACE
} from '../pace';

describe('pace.ts (R006)', () => {
  it('MORPH_EASE is the [0.32, 0.72, 0.34, 1] cubic bezier tuple', () => {
    expect(Array.from(MORPH_EASE)).toEqual([0.32, 0.72, 0.34, 1]);
    expect(MORPH_EASE).toHaveLength(4);
  });

  it('MORPH_TRANSITION default is { duration: 0.7, ease: MORPH_EASE } (R006.AC2)', () => {
    expect(MORPH_TRANSITION.duration).toBe(0.7);
    expect(Array.from(MORPH_TRANSITION.ease)).toEqual([0.32, 0.72, 0.34, 1]);
  });

  it('CAPTION_FADE is a 0.25s easeOut transition', () => {
    expect(CAPTION_FADE.duration).toBe(0.25);
    expect(CAPTION_FADE.ease).toBe('easeOut');
  });

  it('FRAME_FADE is a 0.5s easeOut transition', () => {
    expect(FRAME_FADE.duration).toBe(0.5);
    expect(FRAME_FADE.ease).toBe('easeOut');
  });

  it('FRAME_FADE_OUT is a 0.18s easeIn transition', () => {
    expect(FRAME_FADE_OUT.duration).toBe(0.18);
    expect(FRAME_FADE_OUT.ease).toBe('easeIn');
  });

  it('PACE.textStagger is 0.1s and PACE.bulletStagger is 0.18s', () => {
    expect(PACE.textStagger).toBe(0.1);
    expect(PACE.bulletStagger).toBe(0.18);
  });
});
