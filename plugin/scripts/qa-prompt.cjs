// T006: qa-prompt.cjs — vision-QA rubric prompt builder.
//
// Builds the system prompt (7-axis rubric) and user prompt (image + context)
// for the vision-QA Claude call.
//
// Exports:
//   buildSystemPrompt()  -> string
//   buildUserPrompt({ pngPath, stageName, captionText, tokens }) -> message array

'use strict';

const fs   = require('node:fs');
const path = require('node:path');

const MAX_PNG_BYTES = 5 * 1024 * 1024; // 5 MB hard limit

/**
 * Build the vision-QA system prompt containing all 7 rubric axes.
 * Each axis has a 0-10 scoring guide and explicit thresholds.
 *
 * @returns {string} Full system prompt text.
 */
function buildSystemPrompt() {
  return `You are a professional presentation design reviewer evaluating a single slide from a pitch deck.

Evaluate the provided slide image against the following 7 rubric axes. Score each axis from 0 (failing) to 10 (excellent). Be strict and calibrated — a score of 7 means "acceptable for a professional pitch", a 10 means "exceptional design work".

## Rubric Axes

### 1. Legibility (text_legibility)
Assess whether all text is readable at presentation scale.
- WCAG minimum: contrast ratio >= 4.5:1 for body text, >= 3:1 for large text.
- Headline font size must be >= 32px (equivalent at 1920x1080 resolution).
- Body text must be readable without zooming.
Score 0-10.

### 2. Text-Element Overlap (overlap)
Check whether any text is obscured by a morphing element, image, shape, or background layer.
- Any text obscured by a non-text element scores <= 4.
- Partial overlap that reduces contrast scores <= 6.
Score 0-10.

### 3. Visual Hierarchy (hierarchy)
Evaluate whether the eyebrow (category label) < headline (main message) < body copy in visual weight.
- Correct hierarchy: eyebrow is smallest and least prominent, headline is the dominant typographic element, body is clearly secondary.
- Inverted or flat hierarchy scores <= 5.
Score 0-10.

### 4. Brand Consistency (brand)
Assess whether the colors used match the deck's design tokens.
- Primary colors must be within deltaE < 15 of the declared token values.
- Use of off-brand colors, generic blue/gray defaults, or unexplained palette deviations scores <= 5.
Score 0-10.

### 5. Composition (composition)
Evaluate spatial balance and efficient use of the canvas.
- No dead corner larger than 20% of total canvas area left completely empty.
- Elements should be placed with intentional alignment, not centered-by-default.
- Rule-of-thirds alignment is preferred for the hero element.
Score 0-10.

### 6. On-Brand vs Templatey (onbrand)
Penalize generic corporate slide aesthetics.
- Gratuitous drop shadows that do not match the token palette score <= 5.
- Gradients that are not part of the declared token palette score <= 6.
- Generic slide layouts (title + bullet list, typical conference template) score <= 5.
- Distinctive, purposeful layouts that match the brand identity score >= 8.
Score 0-10.

### 7. Cinematic Quality (cinematic)
Evaluate whether the element placement implies a believable morph trajectory from the previous stage.
- Element positions and sizes should suggest natural motion paths when morphing.
- Jarring or implausible positional jumps between stages score <= 5.
- Smooth, cinematically intentional placement scores >= 8.
Score 0-10.

## Response Format

Respond with a single JSON object and nothing else. No prose before or after. No markdown fences.

The JSON object must have exactly this shape:
{
  "scores": {
    "legibility": <0-10>,
    "overlap": <0-10>,
    "hierarchy": <0-10>,
    "brand": <0-10>,
    "composition": <0-10>,
    "onbrand": <0-10>,
    "cinematic": <0-10>,
    "overall": <0-10>
  },
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "what": "<description of the problem>",
      "where": "<location on the slide, e.g. top-left heading, bottom-right corner>",
      "fix_suggestion": "<actionable fix for the composer>"
    }
  ]
}

Where:
- "critical" issues would prevent the slide from being used in a live pitch (broken text, unreadable content).
- "major" issues are significant quality problems that detract from the pitch.
- "minor" issues are polish items.
- "overall" is your holistic assessment, not a simple average.
- "issues" may be an empty array if there are no problems.

Do not include any text outside the JSON object.`;
}

/**
 * Build the vision-QA user message array for a single stage.
 *
 * @param {object} params
 * @param {string} params.pngPath     - Absolute path to the stage PNG file.
 * @param {string} params.stageName   - Human-readable stage identifier (e.g. "slide-1", "hero").
 * @param {string} params.captionText - Caption / headline text for the stage.
 * @param {object} params.tokens      - Resolved design tokens (key-value, hex colors).
 *
 * @returns {Array<{type:string, source?:object, text?:string}>} Anthropic message content array.
 *
 * @throws {Error} If the PNG file does not exist.
 * @throws {Error} If the PNG file exceeds 5 MB (checked before any API call).
 */
function buildUserPrompt({ pngPath, stageName, captionText, tokens }) {
  // Verify file exists.
  if (!fs.existsSync(pngPath)) {
    throw new Error(`qa-prompt: PNG file not found: ${pngPath}`);
  }

  // Hard size check — measure file size, not base64 length.
  const stat = fs.statSync(pngPath);
  if (stat.size > MAX_PNG_BYTES) {
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `qa-prompt: PNG file too large (${sizeMb} MB). Exceeds 5 MB limit. ` +
      `Reduce image size before calling QA.`
    );
  }

  // Read and base64-encode.
  const pngBuffer = fs.readFileSync(pngPath);
  const b64 = pngBuffer.toString('base64');

  // Build token summary for the text block.
  const tokenLines = Object.entries(tokens || {})
    .map(([key, value]) => `  ${key}: ${value}`)
    .join('\n');

  const tokenSection = tokenLines
    ? `\n## Design Tokens\n${tokenLines}`
    : '';

  const textContent = `## Stage: ${stageName}

## Caption / Headline
${captionText || '(no caption provided)'}
${tokenSection}

Evaluate this slide against the 7 rubric axes in your system prompt. Return only the JSON response object.`;

  return [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: b64,
      },
    },
    {
      type: 'text',
      text: textContent,
    },
  ];
}

/**
 * Build the vision-QA system prompt with 3D content extension (10 rubric axes).
 * This is a superset of buildSystemPrompt() with three additional axes for 3D elements.
 * Call this instead of buildSystemPrompt() when evaluating a stage that contains Element3D.
 *
 * @returns {string} Full system prompt text with 10-axis rubric.
 */
function buildSystemPromptWith3D() {
  return `You are a professional presentation design reviewer evaluating a single slide from a pitch deck that includes 3D elements.

Evaluate the provided slide image against the following 10 rubric axes. Score each axis from 0 (failing) to 10 (excellent). Be strict and calibrated — a score of 7 means "acceptable for a professional pitch", a 10 means "exceptional design work".

## Rubric Axes

### 1. Legibility (text_legibility)
Assess whether all text is readable at presentation scale.
- WCAG minimum: contrast ratio >= 4.5:1 for body text, >= 3:1 for large text.
- Headline font size must be >= 32px (equivalent at 1920x1080 resolution).
- Body text must be readable without zooming.
Score 0-10.

### 2. Text-Element Overlap (overlap)
Check whether any text is obscured by a morphing element, image, shape, or background layer.
- Any text obscured by a non-text element scores <= 4.
- Partial overlap that reduces contrast scores <= 6.
Score 0-10.

### 3. Visual Hierarchy (hierarchy)
Evaluate whether the eyebrow (category label) < headline (main message) < body copy in visual weight.
- Correct hierarchy: eyebrow is smallest and least prominent, headline is the dominant typographic element, body is clearly secondary.
- Inverted or flat hierarchy scores <= 5.
Score 0-10.

### 4. Brand Consistency (brand)
Assess whether the colors used match the deck's design tokens.
- Primary colors must be within deltaE < 15 of the declared token values.
- Use of off-brand colors, generic blue/gray defaults, or unexplained palette deviations scores <= 5.
Score 0-10.

### 5. Composition (composition)
Evaluate spatial balance and efficient use of the canvas.
- No dead corner larger than 20% of total canvas area left completely empty.
- Elements should be placed with intentional alignment, not centered-by-default.
- Rule-of-thirds alignment is preferred for the hero element.
Score 0-10.

### 6. On-Brand vs Templatey (onbrand)
Penalize generic corporate slide aesthetics.
- Gratuitous drop shadows that do not match the token palette score <= 5.
- Gradients that are not part of the declared token palette score <= 6.
- Generic slide layouts (title + bullet list, typical conference template) score <= 5.
- Distinctive, purposeful layouts that match the brand identity score >= 8.
Score 0-10.

### 7. Cinematic Quality (cinematic)
Evaluate whether the element placement implies a believable morph trajectory from the previous stage.
- Element positions and sizes should suggest natural motion paths when morphing.
- Jarring or implausible positional jumps between stages score <= 5.
- Smooth, cinematically intentional placement scores >= 8.
Score 0-10.

### 8. Spatial Coherence (spatial)
Assess whether the 3D element is grounded in the 2D layout and occupies an intentional region.
- The 3D object should not float arbitrarily or feel disconnected from the stage composition.
- Position and scale should suggest the object is occupying a deliberate, intentional space on the slide.
- Ungrounded or floating 3D elements that look pasted-on score <= 4.
- Well-integrated 3D objects that feel part of the slide composition score >= 8.
Score 0-10.

### 9. Motion Sensibility (motion_sensibility)
Evaluate whether 3D animation is legible at video playback speed (30 fps).
- Smooth, readable rotations and transitions that remain clear at 30fps score 8+.
- Flicker, blur, or rotation speeds so fast they become unintelligible score <= 4.
- Animation that is too subtle to notice or too complex to follow scores <= 5.
Score 0-10.

### 10. Tasteful vs Gratuitous (tasteful)
Determine whether the 3D element adds value to the pitch or distracts from it.
- If the same composition works equally well in 2D, the 3D element is gratuitous and scores <= 3.
- If the 3D element adds information, visual interest, or emphasis that 2D cannot provide, score 7+.
- Decorative 3D that does not enhance the message scores <= 4.
- Strategic 3D that reinforces the pitch theme or data concept scores >= 8.
Score 0-10.

## Response Format

Respond with a single JSON object and nothing else. No prose before or after. No markdown fences.

The JSON object must have exactly this shape:
{
  "scores": {
    "legibility": <0-10>,
    "overlap": <0-10>,
    "hierarchy": <0-10>,
    "brand": <0-10>,
    "composition": <0-10>,
    "onbrand": <0-10>,
    "cinematic": <0-10>,
    "spatial": <0-10>,
    "motion_sensibility": <0-10>,
    "tasteful": <0-10>,
    "overall": <0-10>
  },
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "what": "<description of the problem>",
      "where": "<location on the slide, e.g. top-left heading, bottom-right corner>",
      "fix_suggestion": "<actionable fix for the composer, e.g. 'reduce rotationSpeed from 0.5 to 0.15' or 'lower count from 1000 to 400' or 'switch to geometry: box for better legibility at this scale'>"
    }
  ]
}

Where:
- "critical" issues would prevent the slide from being used in a live pitch (broken text, unreadable content).
- "major" issues are significant quality problems that detract from the pitch.
- "minor" issues are polish items.
- "overall" is your holistic assessment, not a simple average.
- "issues" may be an empty array if there are no problems.

Do not include any text outside the JSON object.`;
}

module.exports = { buildSystemPrompt, buildUserPrompt, buildSystemPromptWith3D };
