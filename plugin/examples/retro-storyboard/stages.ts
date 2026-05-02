import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Started',
    caption: {
      eyebrow: 'SPRINT RETRO',
      headline: 'What we started this sprint.',
      sub: 'Three features and two bug fixes.'
    },
    elements: {
      card: {
        pos: { left: '15%', top: '32%', width: '25%', height: '40%' },
        shape: 'card'
      },
      card2: {
        pos: { left: '45%', top: '32%', width: '25%', height: '40%' },
        shape: 'card'
      },
      card3: {
        pos: { left: '30%', top: '75%', width: '25%', height: '18%' },
        shape: 'card'
      }
    },
    frames: {}
  },
  {
    id: 1,
    name: 'Shipped',
    caption: {
      eyebrow: 'SHIPPED',
      headline: 'What we shipped.',
      sub: 'Two features complete. One bug fix deployed.'
    },
    elements: {
      card: {
        pos: { left: '20%', top: '32%', width: '30%', height: '45%' },
        shape: 'card'
      },
      card2: {
        pos: { left: '55%', top: '32%', width: '30%', height: '45%' },
        shape: 'card'
      }
    },
    frames: {}
  },
  {
    id: 2,
    name: 'Wins',
    caption: {
      eyebrow: 'WINS',
      headline: 'What went well.',
      sub: 'Great collaboration. No production incidents.'
    },
    elements: {
      pillar: {
        pos: { left: '15%', top: '28%', width: '25%', height: '55%' },
        shape: 'pillar'
      },
      pillar2: {
        pos: { left: '45%', top: '28%', width: '25%', height: '55%' },
        shape: 'pillar'
      },
      pillar3: {
        pos: { left: '30%', top: '85%', width: '25%', height: '10%' },
        shape: 'pillar'
      }
    },
    frames: {}
  },
  {
    id: 3,
    name: 'Improve',
    caption: {
      eyebrow: 'IMPROVE',
      headline: 'What we can get better at.',
      sub: 'Planning estimation. Design review process.'
    },
    elements: {
      card: {
        pos: { left: '20%', top: '35%', width: '30%', height: '40%' },
        shape: 'card'
      },
      card2: {
        pos: { left: '55%', top: '35%', width: '30%', height: '40%' },
        shape: 'card'
      }
    },
    frames: {}
  },
  {
    id: 4,
    name: 'Celebrate',
    caption: {
      eyebrow: 'CELEBRATE',
      headline: 'Team shoutouts.',
      sub: 'Great work everyone. We shipped, learned, and grew.'
    },
    elements: {
      quote: {
        pos: { left: '15%', top: '35%', width: '70%', height: '45%' },
        shape: 'quote'
      }
    },
    frames: {}
  },
  {
    id: 5,
    name: 'Next',
    caption: {
      eyebrow: 'NEXT SPRINT',
      headline: 'What is next?',
      sub: 'Five features. Mobile optimization. Improve search speed.'
    },
    elements: {
      pillar: {
        pos: { left: '15%', top: '30%', width: '20%', height: '50%' },
        shape: 'pillar'
      },
      pillar2: {
        pos: { left: '40%', top: '30%', width: '20%', height: '50%' },
        shape: 'pillar'
      },
      pillar3: {
        pos: { left: '65%', top: '30%', width: '20%', height: '50%' },
        shape: 'pillar'
      }
    },
    frames: {}
  }
];
