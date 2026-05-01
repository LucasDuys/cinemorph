// Single source of truth for animation timing across the deck. Do not inline durations elsewhere.
// Ported verbatim from C:\dev\stacklink-pitch-roundone\pitch-app\src\deck\pace.ts.
// Cubic bezier (0.32, 0.72, 0.34, 1) gives elements a "physical arrival" —
// fast initial movement, soft landing.

export const MORPH_EASE = [0.32, 0.72, 0.34, 1] as const;

export const MORPH_TRANSITION = {
  duration: 0.7,
  ease: MORPH_EASE
} as const;

export const CAPTION_FADE = {
  duration: 0.25,
  ease: 'easeOut'
} as const;

export const FRAME_FADE = {
  duration: 0.5,
  ease: 'easeOut'
} as const;

export const FRAME_FADE_OUT = {
  duration: 0.18,
  ease: 'easeIn'
} as const;

export const PACE = {
  textStagger: 0.1,
  bulletStagger: 0.18
} as const;
