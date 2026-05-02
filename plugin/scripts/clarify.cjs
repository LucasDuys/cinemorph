// T018: clarify.cjs — pre-composition clarification flow.
//
// Checks a brief + token-merger output for the five key dimensions. If any are
// missing, asks ONE focused multiple-choice question at a time (max 3 rounds).
// `idk` / `skip` answers emit an explicit best-guess line and proceed.
// All captured answers are persisted to <deck>/.morph-deck/brief.json.
//
// Usage:
//   const { runClarify } = require('./clarify.cjs');
//   const result = await runClarify({ brief, tokens, missingFields, deckPath, _promptFn });
//
// Returns:
//   {
//     clarifications: string,   // prose summary to pass to composer
//     briefJson:      object,   // all collected answers
//     persistedPath:  string,   // absolute path to brief.json written
//   }
//
// Dependency injection:
//   _promptFn(question: string) => Promise<string>
//   Pass in a mock in tests; omit to use the default readline-based prompt.

'use strict';

const fs   = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Five dimensions that clarify probes. Each entry provides:
//   key          unique identifier stored in briefJson
//   label        short human-readable name
//   question     the question printed to the user
//   options      multiple-choice answers (A, B, C, ...)
//   defaultGuess if user answers idk/skip, use this as the assumed value
// ---------------------------------------------------------------------------
const DIMENSIONS = [
  {
    key: 'audience',
    label: 'Target audience',
    question: 'Who is the primary audience for this deck?\n' +
      '  A) Investors / VCs\n' +
      '  B) Technical team / engineers\n' +
      '  C) Customers / prospects\n' +
      '  D) Internal stakeholders\n' +
      'Your choice (A/B/C/D or idk):',
    options: { A: 'Investors / VCs', B: 'Technical team / engineers', C: 'Customers / prospects', D: 'Internal stakeholders' },
    defaultGuess: 'Investors / VCs',
  },
  {
    key: 'deckLength',
    label: 'Deck length',
    question: 'How many slides should the deck have?\n' +
      '  A) Short (3-4 slides)\n' +
      '  B) Standard (5-7 slides)\n' +
      '  C) Extended (8-12 slides)\n' +
      'Your choice (A/B/C or idk):',
    options: { A: '3-4 slides', B: '5-7 slides', C: '8-12 slides' },
    defaultGuess: '5-7 slides',
  },
  {
    key: 'presentationContext',
    label: 'Presentation context',
    question: 'How will this deck be presented?\n' +
      '  A) Live (projector / screen share)\n' +
      '  B) Video export (recorded walkthrough)\n' +
      '  C) Mixed (both live and recorded)\n' +
      'Your choice (A/B/C or idk):',
    options: { A: 'live', B: 'video', C: 'mixed' },
    defaultGuess: 'live',
  },
  {
    key: 'toneVoice',
    label: 'Tone / voice',
    question: 'What tone should the deck have?\n' +
      '  A) Confident and cinematic\n' +
      '  B) Clean and minimal\n' +
      '  C) Playful and bold\n' +
      '  D) Technical and precise\n' +
      'Your choice (A/B/C/D or idk):',
    options: { A: 'confident and cinematic', B: 'clean and minimal', C: 'playful and bold', D: 'technical and precise' },
    defaultGuess: 'confident and cinematic',
  },
  {
    key: 'mustInclude',
    label: 'Must-include elements',
    question: 'Are there any elements that MUST appear in the deck?\n' +
      '  A) Specific metrics / KPIs\n' +
      '  B) Team photos or logos\n' +
      '  C) Architecture / flow diagrams\n' +
      '  D) No specific requirements\n' +
      'Your choice (A/B/C/D or idk):',
    options: { A: 'metrics/KPIs', B: 'team photos or logos', C: 'architecture diagrams', D: 'none' },
    defaultGuess: 'none',
  },
];

const MAX_QUESTIONS = 3;
const IDK_TOKENS = new Set(['idk', 'skip', 'i don\'t know', 'i dont know', 'unsure', 'n/a', 'pass']);

/**
 * Decide which dimensions need clarification given the brief and missingFields
 * from token-merger.
 *
 * @param {string}   brief
 * @param {string[]} missingFields - fields flagged by token-merger as absent
 * @returns {Array}  subset of DIMENSIONS to ask about
 */
function detectMissingDimensions(brief, missingFields) {
  const lowerBrief = (brief || '').toLowerCase();
  const needed = [];

  for (const dim of DIMENSIONS) {
    // If token-merger already flagged this key explicitly, always ask.
    if (missingFields && missingFields.includes(dim.key)) {
      needed.push(dim);
      continue;
    }

    // Heuristic: check if any signal for this dimension is in the brief.
    switch (dim.key) {
      case 'audience':
        if (!/investor|vc|investor|technical|engineer|customer|prospect|stakeholder|audience/i.test(lowerBrief)) {
          needed.push(dim);
        }
        break;
      case 'deckLength':
        if (!/\b(\d+)[\s\-]*slide|\bshort\b|\blong\b|\bextended\b|\bbrief\b/i.test(lowerBrief)) {
          needed.push(dim);
        }
        break;
      case 'presentationContext':
        if (!/\blive\b|\bvideo\b|\brecord|\bprojector|\bscreen share|\bmixed/i.test(lowerBrief)) {
          needed.push(dim);
        }
        break;
      case 'toneVoice':
        if (!/\btone\b|\bvoice\b|\bstyle\b|\bcinematic|\bminimal|\bplayful|\bbold|\btechnical|\bprecise/i.test(lowerBrief)) {
          needed.push(dim);
        }
        break;
      case 'mustInclude':
        // Only ask if brief has no specific element references.
        if (!/\bkpi\b|\bmetric|\bteam\b|\barchitecture|\bdiagram|\blogo|\bphoto/i.test(lowerBrief)) {
          needed.push(dim);
        }
        break;
      default:
        needed.push(dim);
    }
  }

  return needed;
}

/**
 * Normalize user input: trim, lowercase, map option letter to value.
 *
 * @param {string} raw
 * @param {object} options - e.g. { A: 'value1', B: 'value2' }
 * @returns {{ isIdk: boolean, value: string|null }}
 */
function parseAnswer(raw, options) {
  const trimmed = (raw || '').trim();
  const lower = trimmed.toLowerCase();

  if (IDK_TOKENS.has(lower)) {
    return { isIdk: true, value: null };
  }

  // Direct letter match (case-insensitive).
  const upper = trimmed.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(options, upper)) {
    return { isIdk: false, value: options[upper] };
  }

  // Free-text: if it matches a value substring, accept it.
  // Guard against empty string matching everything.
  if (lower.length > 0) {
    for (const val of Object.values(options)) {
      if (lower.includes(val.toLowerCase()) || val.toLowerCase().includes(lower)) {
        return { isIdk: false, value: val };
      }
    }
  }

  // Unrecognized — treat as free-text (pass through).
  if (trimmed.length > 0) {
    return { isIdk: false, value: trimmed };
  }

  return { isIdk: true, value: null };
}

/**
 * Build the default readline-based prompt function.
 * Returns a _promptFn compatible signature.
 *
 * @returns {(question: string) => Promise<string>}
 */
function makeReadlinePrompt() {
  const readline = require('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return (question) => new Promise((resolve) => {
    rl.question(question + ' ', (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Persist all captured answers to <deck>/.morph-deck/brief.json.
 *
 * @param {string} deckPath
 * @param {object} briefJson
 * @returns {string} absolute path to the written file
 */
function persistBriefJson(deckPath, briefJson) {
  const morphDir = path.join(deckPath, '.morph-deck');
  fs.mkdirSync(morphDir, { recursive: true });
  const briefPath = path.join(morphDir, 'brief.json');
  // Merge over any existing content so iterate calls accumulate answers.
  let existing = {};
  if (fs.existsSync(briefPath)) {
    try { existing = JSON.parse(fs.readFileSync(briefPath, 'utf8')); } catch (_) { existing = {}; }
  }
  const merged = Object.assign({}, existing, briefJson);
  fs.writeFileSync(briefPath, JSON.stringify(merged, null, 2), 'utf8');
  return briefPath;
}

/**
 * Build a prose clarifications summary from captured answers.
 *
 * @param {object} answers - map of dimension key -> captured value
 * @returns {string}
 */
function buildClarificationsText(answers) {
  if (Object.keys(answers).length === 0) return '';
  const lines = ['Clarification answers:'];
  for (const [key, val] of Object.entries(answers)) {
    const dim = DIMENSIONS.find(d => d.key === key);
    const label = dim ? dim.label : key;
    lines.push(`  ${label}: ${val}`);
  }
  return lines.join('\n');
}

/**
 * Run the clarification flow before deck composition.
 *
 * @param {object} params
 * @param {string}   params.brief          - Raw brief text.
 * @param {object}   [params.tokens]       - Resolved design tokens (unused here but accepted for interface uniformity).
 * @param {string[]} [params.missingFields] - Fields flagged by token-merger.
 * @param {string}   params.deckPath       - Absolute path to the deck directory.
 * @param {Function} [params._promptFn]    - Injected prompt function for tests.
 *                                          Signature: (question: string) => Promise<string>
 * @returns {Promise<{ clarifications: string, briefJson: object, persistedPath: string }>}
 */
async function runClarify({ brief, tokens, missingFields = [], deckPath, _promptFn } = {}) {
  const missingDimensions = detectMissingDimensions(brief, missingFields);

  // Limit to MAX_QUESTIONS.
  const toAsk = missingDimensions.slice(0, MAX_QUESTIONS);

  const answers = {};

  if (toAsk.length > 0) {
    // Obtain prompt function (lazy — only instantiate readline if actually needed).
    let promptFn = _promptFn;
    if (!promptFn) {
      promptFn = makeReadlinePrompt();
    }

    for (const dim of toAsk) {
      const raw = await promptFn(dim.question);
      const { isIdk, value } = parseAnswer(raw, dim.options);

      if (isIdk) {
        process.stdout.write(`Assuming ${dim.defaultGuess} -- change with \`iterate\`\n`);
        answers[dim.key] = dim.defaultGuess;
      } else {
        process.stdout.write(`Captured: ${dim.label}: ${value}\n`);
        answers[dim.key] = value;
      }
    }
  }

  const briefJson = Object.assign({ brief }, answers);
  const persistedPath = persistBriefJson(deckPath, briefJson);
  const clarifications = buildClarificationsText(answers);

  return { clarifications, briefJson, persistedPath };
}

module.exports = {
  runClarify,
  detectMissingDimensions,
  parseAnswer,
  buildClarificationsText,
  persistBriefJson,
  DIMENSIONS,
  MAX_QUESTIONS,
};
