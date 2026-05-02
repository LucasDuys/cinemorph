import type { StageConfig } from '../../scaffold-template/src/deck/stages';
import { HIDDEN } from '../../scaffold-template/src/deck/stages';

export const STAGES: StageConfig[] = [
  {
    id: 0,
    name: 'Q1 Overview',
    caption: {
      eyebrow: 'QUARTERLY REVIEW',
      headline: 'Q1 2024: Strong growth across all metrics.',
      sub: 'Revenue, customer count, and retention all tracking to forecast.'
    },
    elements: {
      kpi1: {
        pos: { left: '8%', top: '28%', width: '25%', height: '22%' },
        shape: 'kpi'
      },
      kpi2: {
        pos: { left: '37%', top: '28%', width: '25%', height: '22%' },
        shape: 'kpi'
      },
      kpi3: {
        pos: { left: '66%', top: '28%', width: '25%', height: '22%' },
        shape: 'kpi'
      },
      kpi4: {
        pos: { left: '8%', top: '54%', width: '25%', height: '22%' },
        shape: 'kpi'
      },
      kpi5: {
        pos: { left: '37%', top: '54%', width: '25%', height: '22%' },
        shape: 'kpi'
      },
      kpi6: {
        pos: { left: '66%', top: '54%', width: '25%', height: '22%' },
        shape: 'kpi'
      }
    },
    frames: {}
  },
  {
    id: 1,
    name: 'Deep Dive Revenue',
    caption: {
      eyebrow: 'REVENUE',
      headline: '2.3M ARR. 45% YoY growth.',
      sub: 'Enterprise tier now accounts for 60% of total recurring revenue.'
    },
    elements: {
      chart: {
        pos: { left: '15%', top: '28%', width: '70%', height: '58%' },
        shape: 'chart'
      }
    },
    frames: {}
  },
  {
    id: 2,
    name: 'Customer Metrics',
    caption: {
      eyebrow: 'CUSTOMERS',
      headline: '180 accounts. 140% net retention.',
      sub: 'Expansion revenue exceeded churn. Land-and-expand motion is working.'
    },
    elements: {
      kpi1: {
        pos: { left: '15%', top: '32%', width: '25%', height: '28%' },
        shape: 'kpi'
      },
      kpi2: {
        pos: { left: '45%', top: '32%', width: '25%', height: '28%' },
        shape: 'kpi'
      },
      chart: {
        pos: { left: '45%', top: '65%', width: '40%', height: '22%' },
        shape: 'chart'
      }
    },
    frames: {}
  },
  {
    id: 3,
    name: 'Forecast',
    caption: {
      eyebrow: 'Q2 FORECAST',
      headline: '3.2M ARR projected. On track for Series B.',
      sub: 'Sales pipeline expanded. Three major enterprise deals in negotiation.'
    },
    elements: {
      chart: {
        pos: { left: '15%', top: '28%', width: '70%', height: '58%' },
        shape: 'chart'
      }
    },
    frames: {}
  }
];
