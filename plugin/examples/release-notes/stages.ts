import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'What is New',
    caption: {
      eyebrow: 'VERSION 3.0',
      headline: 'The biggest release yet.',
      sub: 'A complete redesign. New engine. Better performance.'
    },
    elements: {
      image: {
        pos: { left: '20%', top: '28%', width: '60%', height: '60%' },
        shape: 'image'
      }
    },
    frames: {}
  },
  {
    id: 1,
    name: 'Highlights',
    caption: {
      eyebrow: 'HIGHLIGHTS',
      headline: '50% faster. 70% lighter. Gorgeous new UI.',
      sub: 'Performance improvements under the hood. A completely new visual language.'
    },
    elements: {
      kpi: {
        pos: { left: '20%', top: '32%', width: '22%', height: '35%' },
        shape: 'kpi'
      },
      kpi2: {
        pos: { left: '47%', top: '32%', width: '22%', height: '35%' },
        shape: 'kpi'
      },
      card: {
        pos: { left: '15%', top: '70%', width: '70%', height: '20%' },
        shape: 'card'
      }
    },
    frames: {}
  },
  {
    id: 2,
    name: 'Improvements',
    caption: {
      eyebrow: 'OTHER IMPROVEMENTS',
      headline: 'Dark mode. Keyboard shortcuts. Better mobile.',
      sub: 'And 50 more quality of life improvements based on your feedback.'
    },
    elements: {
      pillar: {
        pos: { left: '15%', top: '28%', width: '25%', height: '58%' },
        shape: 'pillar'
      },
      pillar2: {
        pos: { left: '45%', top: '28%', width: '25%', height: '58%' },
        shape: 'pillar'
      },
      pillar3: {
        pos: { left: '30%', top: '88%', width: '25%', height: '8%' },
        shape: 'pillar'
      }
    },
    frames: {}
  },
  {
    id: 3,
    name: 'Bug Fixes',
    caption: {
      eyebrow: 'BUG FIXES',
      headline: 'We fixed 120 issues.',
      sub: 'Search now works correctly. Export is faster. Sync is reliable.'
    },
    elements: {
      card: {
        pos: { left: '20%', top: '35%', width: '30%', height: '35%' },
        shape: 'card'
      },
      card2: {
        pos: { left: '55%', top: '35%', width: '30%', height: '35%' },
        shape: 'card'
      }
    },
    frames: {}
  },
  {
    id: 4,
    name: 'Download',
    caption: {
      eyebrow: 'AVAILABLE NOW',
      headline: 'Download version 3.0 today.',
      sub: 'Free for all users. Auto-updates in the background. No action needed.'
    },
    elements: {
      image: {
        pos: { left: '20%', top: '35%', width: '60%', height: '40%' },
        shape: 'image'
      }
    },
    frames: {}
  }
];
