import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Context',
    caption: {
      eyebrow: 'CASE STUDY',
      headline: 'How TechCorp cut operations costs by 45%.',
      sub: 'A real customer story. 500-person engineering organization. Manufacturing industry.'
    },
    elements: {
      logo: {
        pos: { left: '35%', top: '40%', width: '30%', height: '20%' },
        shape: 'logo'
      }
    },
    frames: {}
  },
  {
    id: 1,
    name: 'Challenge',
    caption: {
      eyebrow: 'THE CHALLENGE',
      headline: 'Siloed knowledge. Duplicated work. Missed deadlines.',
      sub: 'Teams could not find information. Knowledge lived in tribal heads. New hires took 3 months to ramp.'
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
    id: 2,
    name: 'Approach',
    caption: {
      eyebrow: 'OUR APPROACH',
      headline: 'Centralized knowledge. Automated discovery. AI-powered search.',
      sub: 'We connected their five existing tools into one unified knowledge platform with natural language search.'
    },
    elements: {
      diagram: {
        pos: { left: '15%', top: '28%', width: '70%', height: '60%' },
        shape: 'diagram'
      }
    },
    frames: {}
  },
  {
    id: 3,
    name: 'Results',
    caption: {
      eyebrow: 'RESULTS',
      headline: '45% cost reduction. 90% faster answers. 20% faster onboarding.',
      sub: 'In six months, they saw immediate ROI. Team satisfaction up 35%. New hire ramp time down to 3 weeks.'
    },
    elements: {
      kpi: {
        pos: { left: '15%', top: '32%', width: '25%', height: '35%' },
        shape: 'kpi'
      },
      kpi2: {
        pos: { left: '45%', top: '32%', width: '25%', height: '35%' },
        shape: 'kpi'
      },
      kpi3: {
        pos: { left: '30%', top: '70%', width: '25%', height: '20%' },
        shape: 'kpi'
      }
    },
    frames: {}
  }
];
