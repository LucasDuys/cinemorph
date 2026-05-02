import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Hero',
    caption: {
      eyebrow: 'LAUNCHING TODAY',
      headline: 'Say hello to the future.',
      sub: ''
    },
    elements: {
      wordmark: {
        pos: { left: '20%', top: '38%', width: '60%', height: '24%' },
        shape: 'hero'
      }
    },
    frames: { hero: true }
  },
  {
    id: 1,
    name: 'Feature',
    caption: {
      eyebrow: 'FEATURE ONE',
      headline: 'Instant setup. No complexity.',
      sub: ''
    },
    elements: {
      image: {
        pos: { left: '15%', top: '28%', width: '70%', height: '60%' },
        shape: 'image'
      }
    },
    frames: {}
  },
  {
    id: 2,
    name: 'Benefit',
    caption: {
      eyebrow: 'THE BENEFIT',
      headline: 'Save 10 hours every week.',
      sub: ''
    },
    elements: {
      kpi: {
        pos: { left: '35%', top: '40%', width: '30%', height: '30%' },
        shape: 'kpi'
      }
    },
    frames: {}
  },
  {
    id: 3,
    name: 'Proof',
    caption: {
      eyebrow: 'TRUSTED BY',
      headline: 'Thousands of teams love us.',
      sub: ''
    },
    elements: {
      logo: {
        pos: { left: '15%', top: '30%', width: '25%', height: '20%' },
        shape: 'logo'
      },
      logo2: {
        pos: { left: '45%', top: '30%', width: '25%', height: '20%' },
        shape: 'logo'
      },
      logo3: {
        pos: { left: '30%', top: '55%', width: '25%', height: '20%' },
        shape: 'logo'
      }
    },
    frames: {}
  },
  {
    id: 4,
    name: 'CTA',
    caption: {
      eyebrow: 'READY?',
      headline: 'Start for free today.',
      sub: 'No credit card required. First team gets lifetime access.'
    },
    elements: {
      wordmark: {
        pos: { left: '20%', top: '38%', width: '60%', height: '24%' },
        shape: 'hero'
      }
    },
    frames: {}
  },
  {
    id: 5,
    name: 'Closing',
    caption: {
      eyebrow: 'THANK YOU',
      headline: 'See you at launch.com',
      sub: ''
    },
    elements: {
      wordmark: {
        pos: { left: '20%', top: '38%', width: '60%', height: '24%' },
        shape: 'hero'
      }
    },
    frames: {}
  }
];
