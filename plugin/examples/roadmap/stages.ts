import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Overview',
    caption: {
      eyebrow: 'PRODUCT ROADMAP',
      headline: 'Where we are going.',
      sub: 'A transparent look at the next year of development.'
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
    name: 'Now',
    caption: {
      eyebrow: 'NOW',
      headline: 'Live today. In production.',
      sub: 'Core platform. Five connectors. Natural language search. User authentication.'
    },
    elements: {
      card: {
        pos: { left: '12%', top: '28%', width: '22%', height: '48%' },
        shape: 'card'
      },
      card2: {
        pos: { left: '38%', top: '28%', width: '22%', height: '48%' },
        shape: 'card'
      },
      card3: {
        pos: { left: '64%', top: '28%', width: '22%', height: '48%' },
        shape: 'card'
      }
    },
    frames: {}
  },
  {
    id: 2,
    name: 'Next',
    caption: {
      eyebrow: 'NEXT',
      headline: 'Coming in 3 months.',
      sub: 'Enterprise authentication. Mobile app. API v2. Ten more connectors. Advanced analytics.'
    },
    elements: {
      pillar: {
        pos: { left: '12%', top: '28%', width: '18%', height: '55%' },
        shape: 'pillar'
      },
      pillar2: {
        pos: { left: '34%', top: '28%', width: '18%', height: '55%' },
        shape: 'pillar'
      },
      pillar3: {
        pos: { left: '56%', top: '28%', width: '18%', height: '55%' },
        shape: 'pillar'
      },
      pillar4: {
        pos: { left: '23%', top: '86%', width: '18%', height: '10%' },
        shape: 'pillar'
      }
    },
    frames: {}
  },
  {
    id: 3,
    name: 'Later',
    caption: {
      eyebrow: 'LATER',
      headline: '6 to 12 months out.',
      sub: 'AI-powered synthesis. Multi-workspace. Whiteboard collaboration. Custom workflows. Integrations as a service.'
    },
    elements: {
      card: {
        pos: { left: '15%', top: '32%', width: '28%', height: '40%' },
        shape: 'card'
      },
      card2: {
        pos: { left: '48%', top: '32%', width: '28%', height: '40%' },
        shape: 'card'
      },
      card3: {
        pos: { left: '32%', top: '75%', width: '28%', height: '18%' },
        shape: 'card'
      }
    },
    frames: {}
  }
];
