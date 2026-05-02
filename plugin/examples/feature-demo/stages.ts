import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Hero',
    caption: {
      eyebrow: 'FEATURE ANNOUNCEMENT',
      headline: 'Introducing Smart Filtering.',
      sub: 'Find what you need in seconds, not minutes.'
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
    name: 'Capability One',
    caption: {
      eyebrow: 'NATURAL LANGUAGE',
      headline: 'Ask in English. Get results instantly.',
      sub: 'No query syntax. No learning curve.'
    },
    elements: {
      image: {
        pos: { left: '8%', top: '18%', width: '84%', height: '70%' },
        shape: 'image'
      }
    },
    frames: {}
  },
  {
    id: 2,
    name: 'Capability Two',
    caption: {
      eyebrow: 'SMART CATEGORIES',
      headline: 'One-click filters. Auto-organized.',
      sub: 'We learn your patterns. Suggestions improve over time.'
    },
    elements: {
      image: {
        pos: { left: '8%', top: '18%', width: '84%', height: '70%' },
        shape: 'image'
      }
    },
    frames: {}
  },
  {
    id: 3,
    name: 'Impact',
    caption: {
      eyebrow: 'THE IMPACT',
      headline: 'Teams find answers 5x faster.',
      sub: 'Available now for all premium accounts. Free tier coming next month.'
    },
    elements: {
      kpi: {
        pos: { left: '30%', top: '38%', width: '40%', height: '30%' },
        shape: 'kpi'
      }
    },
    frames: {}
  }
];
