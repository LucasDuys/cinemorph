const test = require('node:test');
const assert = require('node:assert');
const { lintLayout } = require('../lint-layout.cjs');

test('lint-layout: bound checks', async (t) => {
  const stagesPath = '/tmp/test-stages.json';

  await t.test('rejects position < 0%', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Bad',
        elements: {
          hero: {
            pos: { left: '-5%', top: '50%', width: '50%', height: '50%' },
            shape: 'hero'
          }
        }
      }]
    });
    assert.ok(result.errors.length > 0, 'Should have error for left=-5%');
  });

  await t.test('rejects position > 100%', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Bad',
        elements: {
          hero: {
            pos: { left: '105%', top: '50%', width: '50%', height: '50%' },
            shape: 'hero'
          }
        }
      }]
    });
    assert.ok(result.errors.length > 0, 'Should have error for left=105%');
  });

  await t.test('rejects width > 100%', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Bad',
        elements: {
          hero: {
            pos: { left: '0%', top: '0%', width: '120%', height: '50%' },
            shape: 'hero'
          }
        }
      }]
    });
    assert.ok(result.errors.length > 0, 'Should have error for width=120%');
  });

  await t.test('rejects height > 100%', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Bad',
        elements: {
          hero: {
            pos: { left: '0%', top: '0%', width: '50%', height: '150%' },
            shape: 'hero'
          }
        }
      }]
    });
    assert.ok(result.errors.length > 0, 'Should have error for height=150%');
  });

  await t.test('allows valid positions [0%, 100%]', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Good',
        elements: {
          hero: {
            pos: { left: '0%', top: '0%', width: '100%', height: '100%' },
            shape: 'hero'
          }
        }
      }]
    });
    assert.equal(result.errors.length, 0, 'Valid positions should have no errors');
  });
});

test('lint-layout: duplicate detection', async (t) => {
  await t.test('detects duplicate persistent layouts', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Dup',
        elements: {
          hero: {
            pos: { left: '10%', top: '10%', width: '50%', height: '50%' },
            shape: 'hero'
          },
          card: {
            pos: { left: '10%', top: '10%', width: '50%', height: '50%' },
            shape: 'card'
          }
        }
      }]
    });
    assert.ok(result.errors.length > 0, 'Should detect duplicate layouts');
  });

  await t.test('ignores HIDDEN (0%,0%,0%,0%) duplicates', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'AllHidden',
        elements: {
          hero: {
            pos: { left: '50%', top: '50%', width: '0%', height: '0%' },
            shape: 'hidden'
          },
          card: {
            pos: { left: '50%', top: '50%', width: '0%', height: '0%' },
            shape: 'hidden'
          }
        }
      }]
    });
    assert.equal(result.errors.length, 0, 'Multiple HIDDEN elements should not error');
  });
});

test('lint-layout: warnings', async (t) => {
  await t.test('warns for caption headline > 26ch', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Long',
        caption: {
          headline: 'This is a very long headline that exceeds the 26 character limit'
        },
        elements: {}
      }]
    });
    assert.ok(result.warnings.length > 0, 'Should warn for headline > 26ch');
  });

  await t.test('warns for > 12 primitives per stage', () => {
    const elems = {};
    for (let i = 0; i < 15; i++) {
      elems[`elem${i}`] = {
        pos: { left: `${i * 5}%`, top: '0%', width: '5%', height: '100%' },
        shape: 'card'
      };
    }
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Many',
        elements: elems
      }]
    });
    assert.ok(result.warnings.length > 0, 'Should warn for > 12 primitives');
  });
});

test('lint-layout: empty/clean stages', async (t) => {
  await t.test('returns zero errors for clean stages', () => {
    const result = lintLayout({
      stages: [{
        id: 1,
        name: 'Clean',
        caption: {
          eyebrow: 'Eye',
          headline: 'Short'
        },
        elements: {
          hero: {
            pos: { left: '10%', top: '20%', width: '80%', height: '60%' },
            shape: 'hero'
          }
        }
      }]
    });
    assert.equal(result.errors.length, 0, 'Clean stage should have no errors');
  });
});
