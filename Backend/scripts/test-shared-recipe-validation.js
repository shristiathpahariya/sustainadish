/**
 * Validates shareRecipe payload rules (no database).
 * Run: npm run test:shared-recipe
 */
const assert = require('assert');
const SharedRecipeController = require('../controllers/sharedRecipeController');

const { validateRecipeSharePayload } = SharedRecipeController;

function ok(payload, label) {
  const r = validateRecipeSharePayload(payload);
  assert.strictEqual(r.ok, true, `${label}: expected ok`);
  return r;
}

function fail(payload, label) {
  const r = validateRecipeSharePayload(payload);
  assert.strictEqual(r.ok, false, `${label}: expected failure`);
  return r;
}

try {
  fail(null, 'null body');
  fail({}, 'empty');
  fail({ title: '  ', ingredients: ['a'] }, 'blank title');
  fail({ title: 'T', ingredients: null }, 'no ingredients');
  fail({ title: 'T', ingredients: [] }, 'empty array');
  fail({ title: 'T', ingredients: '   ' }, 'blank string ingredients');

  const longTitle = 'x'.repeat(501);
  fail({ title: longTitle, ingredients: ['a'] }, 'title too long');

  const r1 = ok(
    { title: ' My Dish ', ingredients: ['Salt', 'Pepper'], instructions: 'Mix.' },
    'minimal valid'
  );
  assert.strictEqual(r1.title, 'My Dish');
  assert.strictEqual(r1.instructions, 'Mix.');

  const r2 = ok(
    { title: 'T', ingredients: 'flour, water' },
    'string ingredients'
  );
  assert.strictEqual(Array.isArray(r2.ingredients), false);

  console.log('sharedRecipe validation checks passed.');
} catch (e) {
  console.error(e);
  process.exit(1);
}
