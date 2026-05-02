// Static data for the pitch deck. Keeping it in one place so copy edits
// are quick before any pitch.

export type ConnectorId = 'drive' | 'slack' | 'github' | 'notion' | 'onedrive';

export const CONNECTORS: Array<{ id: ConnectorId; label: string; color: string }> = [
  { id: 'drive', label: 'Google Drive', color: '#4285F4' },
  { id: 'slack', label: 'Slack', color: '#4A154B' },
  { id: 'github', label: 'GitHub', color: '#181717' },
  { id: 'notion', label: 'Notion', color: '#000000' },
  { id: 'onedrive', label: 'OneDrive', color: '#0078D4' }
];

export const ASKS = [
  {
    n: 1,
    label: 'Test partners',
    detail:
      'EU mid-market companies (50–500 employees). Pilot Stacklink on real data — free of charge — so we can measure time saved.'
  },
  {
    n: 2,
    label: 'Honest feedback',
    detail: 'What’s missing, who we should meet, where the story falls flat.'
  },
  {
    n: 3,
    label: 'Stay in touch',
    detail: 'No formal follow-up — drop a note if something here resonates.'
  }
];

// Slide 4 — the agentic-infrastructure arc. Three phases on one slide:
// where we are now, what we ship next, where this becomes a platform.
export const TOMORROW_PHASES = [
  {
    tag: 'NOW',
    title: 'Automated onboarding',
    sub: 'Admin adds an email. Accounts get provisioned, an onboarding plan is generated, and a chat is open for stuck moments — all from the company graph.'
  },
  {
    tag: 'NEXT',
    title: 'Agents on top of the same brain',
    sub: 'Lead validation. Contract drafting. Meeting prep. Each new agent inherits the same knowledge layer and the same permissions.'
  },
  {
    tag: 'LONG-TERM',
    title: 'Agent deployment platform',
    sub: 'A user describes a task. The system finds the APIs, configures the auth, ships the agent. Stacklink replaces the connectors and becomes the platform.'
  }
];

// Stat sources — chips below each stat on slide 2. Defensible numbers,
// each citable on the slide itself.
export const PROBLEM_STATS = [
  {
    value: '1.8h',
    label: 'lost per knowledge worker / day',
    source: 'McKinsey · 2012'
  },
  {
    value: '€19k',
    label: 'cost per employee / year',
    source: '1.8h × 220d × €48/hr'
  },
  {
    value: '89',
    label: 'SaaS apps in the average company',
    source: 'Okta · 2024'
  }
];

export const TEAM = [
  {
    name: 'Lucas Duys',
    role: 'Co-founder',
    school: 'TU/e · Computer Science 2nd yr',
    proof: 'AI engineering intern at cape.io · Brainport-based'
  },
  {
    name: 'Julius Brussee',
    role: 'Co-founder',
    school: 'Leiden · Data Science & AI',
    proof:
      'Creator of Caveman (48k+ GitHub stars, HN front page) · Cavekit · The Prompt Library · Founder, Revu Labs'
  }
];

// Med-tech field interview — the visible quote on slide 2.
export const PROBLEM_QUOTE = {
  who: 'Operations lead · 200-person Dutch medtech',
  text: '“Our travel policy was buried in a Slack thread from six months ago. We spent forty minutes finding it.”'
};

export const SAMPLE_QUERY = 'Where is our latest DPIA for the new vendor?';

export const SAMPLE_ANSWER = {
  text: 'The most recent DPIA for Acme Vendor was completed on 2026-03-14 by the Compliance team. It covers data residency, sub-processor list, and includes the signed DPA addendum.',
  citations: [
    { source: 'drive' as const, doc: 'DPIA_Acme_2026-03.pdf' },
    { source: 'notion' as const, doc: 'Compliance / Vendor Reviews' },
    { source: 'slack' as const, doc: '#legal-vendors · Mar 14' }
  ]
};

export const OPS_LOOP = [
  'Ingest',
  'Detect change',
  'Triage',
  'Notify',
  'Analyze',
  'Improve'
];
