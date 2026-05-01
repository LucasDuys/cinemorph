const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateNotes, syncFromNotes } = require('../sync-notes.cjs');

test('sync-notes: generateNotes', async (t) => {
  await t.test('creates markdown with all sections', () => {
    const stages = [
      {
        id: 1,
        name: 'Intro',
        caption: {
          eyebrow: 'Welcome',
          headline: 'Hello World',
          sub: 'Subtitle here'
        },
        talkTrack: {
          script: 'This is the opening slide. Tell them the story.',
          dwellSeconds: 3,
          cues: ['Pause', 'Smile']
        }
      }
    ];
    const markdown = generateNotes(stages);
    assert.ok(markdown.includes('## Stage 1: Intro'), 'Should include stage heading');
    assert.ok(markdown.includes('**Eyebrow:** Welcome'), 'Should include eyebrow');
    assert.ok(markdown.includes('**Headline:** Hello World'), 'Should include headline');
    assert.ok(markdown.includes('**Dwell:** 3s'), 'Should include dwell time');
    assert.ok(markdown.includes('**Cues:** Pause, Smile'), 'Should include cues');
    assert.ok(markdown.includes('This is the opening slide'), 'Should include script');
  });

  await t.test('computes dwellSeconds from wordCount when not set', () => {
    const stages = [
      {
        id: 1,
        name: 'Test',
        caption: { eyebrow: 'E', headline: 'H' },
        talkTrack: {
          script: 'One two three four five six seven eight nine ten. ' +
                 'One two three four five six seven eight nine ten. ' +
                 'One two three four five six seven eight nine ten. ' // ~30 words
        }
      }
    ];
    const markdown = generateNotes(stages);
    // wordCount ~30, so dwell ~(30/150)+1.5 = 0.2+1.5 = 1.7 -> Math.ceil(1.7) = 2
    assert.ok(markdown.includes('**Dwell:** 2s'), 'Should compute dwell as ceil((wordCount/150)+1.5)');
  });

  await t.test('marks backup stages with [BACKUP]', () => {
    const stages = [
      {
        id: 1,
        name: 'Main',
        caption: { eyebrow: 'M', headline: 'Main' },
        backup: false,
        talkTrack: { script: 'Main stage' }
      },
      {
        id: 2,
        name: 'Backup',
        caption: { eyebrow: 'B', headline: 'Backup' },
        backup: true,
        talkTrack: { script: 'Backup stage' }
      }
    ];
    const markdown = generateNotes(stages);
    assert.ok(markdown.includes('## Stage 1: Main') && !markdown.match(/## Stage 1.*\[BACKUP\]/), 'Main stage should not be marked');
    assert.ok(markdown.includes('[BACKUP]') && markdown.includes('## Stage 2: Backup'), 'Backup stage should be marked');
  });
});

test('sync-notes: syncFromNotes (reverse sync)', async (t) => {
  await t.test('updates script field from notes.md', () => {
    const stages = [
      {
        id: 1,
        name: 'Test',
        caption: { eyebrow: 'E', headline: 'H' },
        talkTrack: { script: 'Old script', dwellSeconds: 5, cues: ['Old cue'] }
      }
    ];

    const notesContent = `## Stage 1: Test
**Eyebrow:** E
**Headline:** H
**Dwell:** 5s
**Cues:** New cue

This is the new script from the notes.md file.`;

    const updated = syncFromNotes(stages, notesContent);
    assert.equal(updated[0].talkTrack.script, 'This is the new script from the notes.md file.', 'Script should be updated');
    assert.equal(updated[0].talkTrack.dwellSeconds, 5, 'Dwell should remain unchanged');
    assert.deepEqual(updated[0].talkTrack.cues, ['Old cue'], 'Cues should not be updated (read-only in notes)');
  });

  await t.test('preserves other fields from stages', () => {
    const stages = [
      {
        id: 1,
        name: 'Test',
        caption: { eyebrow: 'E', headline: 'H' },
        elements: { hero: { pos: {}, shape: 'hero' } },
        talkTrack: { script: 'Old' }
      }
    ];

    const notesContent = `## Stage 1: Test
**Eyebrow:** E
**Headline:** H

New script`;

    const updated = syncFromNotes(stages, notesContent);
    assert.ok(updated[0].elements, 'Should preserve elements');
    assert.equal(updated[0].caption.headline, 'H', 'Should preserve caption');
  });

  await t.test('handles missing talkTrack by creating it', () => {
    const stages = [
      {
        id: 1,
        name: 'Test',
        caption: { eyebrow: 'E', headline: 'H' }
        // no talkTrack
      }
    ];

    const notesContent = `## Stage 1: Test
**Eyebrow:** E
**Headline:** H

New script`;

    const updated = syncFromNotes(stages, notesContent);
    assert.ok(updated[0].talkTrack, 'Should create talkTrack');
    assert.equal(updated[0].talkTrack.script, 'New script', 'Script should be set');
  });
});

test('sync-notes: integration', async (t) => {
  await t.test('round-trip: generate and sync back', () => {
    const original = [
      {
        id: 1,
        name: 'Intro',
        caption: { eyebrow: 'Welcome', headline: 'Hello' },
        talkTrack: { script: 'Opening line here.' }
      }
    ];

    // Generate markdown
    const markdown = generateNotes(original);
    // Simulate user edit: change the script
    const edited = markdown.replace('Opening line here.', 'New opening line.');
    // Sync back
    const synced = syncFromNotes(original, edited);

    assert.equal(synced[0].talkTrack.script, 'New opening line.', 'Script should be updated from notes');
  });
});
