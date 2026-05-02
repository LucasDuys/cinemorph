import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Meet the Team',
    caption: {
      eyebrow: 'OUR TEAM',
      headline: 'The people behind the product.',
      sub: 'Five engineers, designers, and builders from around the world.'
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
    id: 1,
    name: 'Team Member One',
    caption: {
      eyebrow: 'CEO & FOUNDER',
      headline: 'Jamie Chen.',
      sub: 'Stanford degree. Previously at Google Cloud. Loves mountain biking and philosophy.'
    },
    elements: {
      image: {
        pos: { left: '15%', top: '25%', width: '35%', height: '60%' },
        shape: 'image'
      },
      quote: {
        pos: { left: '55%', top: '28%', width: '40%', height: '50%' },
        shape: 'quote'
      }
    },
    frames: {}
  },
  {
    id: 2,
    name: 'Team Member Two',
    caption: {
      eyebrow: 'CTO & COFOUNDER',
      headline: 'Alex Kumar.',
      sub: 'MIT CS degree. Built infrastructure at Stripe. Rock climber. Fermentation enthusiast.'
    },
    elements: {
      image: {
        pos: { left: '15%', top: '25%', width: '35%', height: '60%' },
        shape: 'image'
      },
      quote: {
        pos: { left: '55%', top: '28%', width: '40%', height: '50%' },
        shape: 'quote'
      }
    },
    frames: {}
  },
  {
    id: 3,
    name: 'Team Member Three',
    caption: {
      eyebrow: 'HEAD OF DESIGN',
      headline: 'Morgan Lee.',
      sub: 'Design degree from MICA. Led design at Figma. Photographer. Coffee connoisseur.'
    },
    elements: {
      image: {
        pos: { left: '15%', top: '25%', width: '35%', height: '60%' },
        shape: 'image'
      },
      quote: {
        pos: { left: '55%', top: '28%', width: '40%', height: '50%' },
        shape: 'quote'
      }
    },
    frames: {}
  },
  {
    id: 4,
    name: 'Team Member Four',
    caption: {
      eyebrow: 'HEAD OF SALES',
      headline: 'Jordan Smith.',
      sub: 'Sales leader at Salesforce. Built enterprise teams. Hiking advocate. Bookworm.'
    },
    elements: {
      image: {
        pos: { left: '15%', top: '25%', width: '35%', height: '60%' },
        shape: 'image'
      },
      quote: {
        pos: { left: '55%', top: '28%', width: '40%', height: '50%' },
        shape: 'quote'
      }
    },
    frames: {}
  }
];
