const fs = require('fs');
const path = require('path');
const Recipe = require('../models/Recipe');

function normalizeIngredientsForCsv(ingredients) {
  if (ingredients == null) return '';
  if (typeof ingredients === 'string') return ingredients;
  try {
    return JSON.stringify(ingredients);
  } catch {
    return String(ingredients);
  }
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  // RFC4180-ish: quote if contains comma, quote, or newline; double quotes inside.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function computeTrainingStats(recipes) {
  const stats = {
    total: recipes.length,
    withAuthor: 0,
    avgTitleLength: 0,
    avgInstructionsLength: 0,
    ingredientKind: { array: 0, string: 0, object: 0, other: 0, empty: 0 },
    likes: { total: 0, avg: 0, max: 0 },
  };

  let titleSum = 0;
  let instrSum = 0;
  let likesSum = 0;
  let likesMax = 0;

  for (const r of recipes) {
    if (r.author) stats.withAuthor += 1;

    const title = typeof r.title === 'string' ? r.title : '';
    const instructions = typeof r.instructions === 'string' ? r.instructions : '';
    titleSum += title.length;
    instrSum += instructions.length;

    const likes = typeof r.likes === 'number' ? r.likes : 0;
    likesSum += likes;
    if (likes > likesMax) likesMax = likes;

    const ing = r.ingredients;
    if (ing == null) {
      stats.ingredientKind.empty += 1;
    } else if (Array.isArray(ing)) {
      stats.ingredientKind.array += 1;
    } else if (typeof ing === 'string') {
      stats.ingredientKind.string += 1;
    } else if (typeof ing === 'object') {
      stats.ingredientKind.object += 1;
    } else {
      stats.ingredientKind.other += 1;
    }
  }

  stats.avgTitleLength = stats.total ? titleSum / stats.total : 0;
  stats.avgInstructionsLength = stats.total ? instrSum / stats.total : 0;
  stats.likes.total = likesSum;
  stats.likes.avg = stats.total ? likesSum / stats.total : 0;
  stats.likes.max = likesMax;

  return stats;
}

/**
 * Pulls all approved recipes for training (status=published).
 * @param {{ limit?: number, projection?: any }} [opts]
 */
async function extractApprovedRecipes(opts = {}) {
  const limit =
    typeof opts.limit === 'number' && opts.limit > 0 ? Math.floor(opts.limit) : null;

  const query = Recipe.find({ status: 'published' })
    .sort({ updatedAt: -1 })
    .select(
      opts.projection || 'recipeKey title ingredients instructions author likes createdAt updatedAt'
    )
    .lean({ virtuals: true });

  if (limit) query.limit(limit);

  const recipes = await query;
  const stats = computeTrainingStats(recipes);

  return { recipes, stats };
}

/**
 * Exports approved recipes to a CSV file.
 * @param {{ outputPath?: string, limit?: number }} [opts]
 */
async function exportApprovedRecipesToCsv(opts = {}) {
  const { recipes, stats } = await extractApprovedRecipes({ limit: opts.limit });

  const out =
    typeof opts.outputPath === 'string' && opts.outputPath.trim()
      ? path.resolve(opts.outputPath.trim())
      : path.join(
          process.cwd(),
          `approved-recipes-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
        );

  fs.mkdirSync(path.dirname(out), { recursive: true });

  const header = [
    'recipeId',
    'recipeKey',
    'title',
    'ingredients',
    'instructions',
    'authorId',
    'likes',
    'createdAt',
    'updatedAt',
  ];

  const lines = [header.map(csvEscape).join(',')];
  for (const r of recipes) {
    lines.push(
      [
        r._id,
        r.recipeKey,
        r.title,
        normalizeIngredientsForCsv(r.ingredients),
        r.instructions,
        r.author || '',
        typeof r.likes === 'number' ? r.likes : 0,
        r.createdAt ? new Date(r.createdAt).toISOString() : '',
        r.updatedAt ? new Date(r.updatedAt).toISOString() : '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  fs.writeFileSync(out, `${lines.join('\n')}\n`, 'utf8');

  return {
    outputPath: out,
    rowCount: recipes.length,
    stats,
  };
}

module.exports = {
  extractApprovedRecipes,
  exportApprovedRecipesToCsv,
  computeTrainingStats,
};

