import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Intro',
    caption: {
      eyebrow: 'OUR MANIFESTO',
      headline: 'We believe in simplicity.',
      sub: ''
    },
    elements: {},
    frames: { hero: true }
  },
  {
    id: 1,
    name: 'Thesis One',
    caption: {
      eyebrow: 'ONE',
      headline: 'Complexity is the enemy of understanding.',
      sub: 'Most products are 10 features solving one problem. We build one feature solving ten problems.'
    },
    elements: {},
    frames: {}
  },
  {
    id: 2,
    name: 'Thesis Two',
    caption: {
      eyebrow: 'TWO',
      headline: 'Your time is your most scarce resource.',
      sub: 'We design every interaction to save minutes, not seconds. Compounding over a lifetime.'
    },
    elements: {},
    frames: {}
  },
  {
    id: 3,
    name: 'Thesis Three',
    caption: {
      eyebrow: 'THREE',
      headline: 'Beauty and function are not separate concerns.',
      sub: 'Design that delights users is also the most efficient design. Aesthetics enable adoption.'
    },
    elements: {},
    frames: {}
  },
  {
    id: 4,
    name: 'Closing',
    caption: {
      eyebrow: 'THEREFORE',
      headline: 'We build differently.',
      sub: 'Join us in making technology simple again.'
    },
    elements: {},
    frames: {}
  }
];
