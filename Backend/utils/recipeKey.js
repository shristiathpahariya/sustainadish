const crypto = require('crypto');

/**
 * Normalize ingredient input (string or array) into sorted lowercase tokens for stable hashing.
 */
function normalizeIngredientList(ingredients) {
  if (Array.isArray(ingredients)) {
    return ingredients
      .map((i) => String(i).trim().toLowerCase())
      .filter(Boolean)
      .sort();
  }
  const s = String(ingredients ?? '').trim();
  if (!s) return [];
  return s
    .split(/[,;\n]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

/**
 * Deterministic id for a recipe from title + ingredients (no DB seeding).
 */
function buildRecipeKey(title, ingredients) {
  const t = String(title ?? '')
    .trim()
    .toLowerCase();
  const parts = normalizeIngredientList(ingredients);
  const payload = `${t}|${parts.join('|')}`;
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

module.exports = {
  buildRecipeKey,
  normalizeIngredientList,
};
