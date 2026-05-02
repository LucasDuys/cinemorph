// Pitch 5-slide example. Investor pitch: hook, problem, solution, traction, ask.

import type { StageConfig } from './stages';
import { HIDDEN } from './stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Hook',
    caption: {
      eyebrow: 'OUR COMPANY',
      headline: 'We build solutions for the future.',
      sub: 'A pitch for round one ventures.'
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
    name: 'Problem',
    caption: {
      eyebrow: 'THE PROBLEM',
      headline: 'Things are broken. People know it.',
      sub: 'A real story: thousands of dollars wasted every year because nobody can find what they need.'
    },
    elements: {
      wordmark: {
        pos: { left: '6%', top: '14%', width: '16%', height: '6%' },
        shape: 'pipeline'
      },
      diagram: {
        pos: { left: '30%', top: '35%', width: '65%', height: '50%' },
        shape: 'diagram'
      }
    },
    frames: { problem: true }
  },
  {
    id: 2,
    name: 'Solution',
    caption: {
      eyebrow: 'OUR SOLUTION',
      headline: 'We automate what humans struggle with.',
      sub: 'One integrated platform replacing five legacy tools. 10x faster. 90% cost reduction.'
    },
    elements: {
      wordmark: {
        pos: { left: '6%', top: '14%', width: '16%', height: '6%' },
        shape: 'pipeline'
      },
      kpi: {
        pos: { left: '28%', top: '32%', width: '20%', height: '18%' },
        shape: 'kpi'
      },
      kpi2: {
        pos: { left: '52%', top: '32%', width: '20%', height: '18%' },
        shape: 'kpi'
      },
      kpi3: {
        pos: { left: '40%', top: '56%', width: '20%', height: '18%' },
        shape: 'kpi'
      }
    },
    frames: { solution: true }
  },
  {
    id: 3,
    name: 'Traction',
    caption: {
      eyebrow: 'TRACTION',
      headline: 'Growth at scale. Revenue up 300%.',
      sub: 'Five customers live. Annualized run rate of 2.3M. Net dollar retention: 140%.'
    },
    elements: {
      wordmark: {
        pos: { left: '6%', top: '14%', width: '16%', height: '6%' },
        shape: 'pipeline'
      },
      chart: {
        pos: { left: '30%', top: '30%', width: '65%', height: '55%' },
        shape: 'chart'
      }
    },
    frames: { traction: true }
  },
  {
    id: 4,
    name: 'Ask',
    caption: {
      eyebrow: 'WHAT WE NEED',
      headline: 'Series A: 10 million to scale go-to-market.',
      sub: 'Funds for sales, engineering, and geographic expansion. Existing investors committed to doubling down.'
    },
    elements: {
      wordmark: {
        pos: { left: '20%', top: '38%', width: '60%', height: '24%' },
        shape: 'hero'
      },
      statgroup: {
        pos: { left: '10%', top: '68%', width: '80%', height: '20%' },
        shape: 'kpi'
      }
    },
    frames: { ask: true }
  }
];
