const Recipe = require('../models/Recipe');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'likes', 'title']);

function parsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

/**
 * Builds a mongoose sort object from whitelisted field + asc/desc.
 */
function resolveSort(sortByRaw, orderRaw) {
  const sortBy = SORT_FIELDS.has(String(sortByRaw || '').trim())
    ? String(sortByRaw).trim()
    : 'updatedAt';
  const order = String(orderRaw || '')
    .trim()
    .toLowerCase();
  const asc = order === 'asc';

  if (sortBy === 'title') {
    return { title: asc ? 1 : -1, updatedAt: -1 };
  }

  const dir = asc ? 1 : -1;
  const sort = { [sortBy]: dir };
  if (sortBy === 'likes') {
    sort.updatedAt = -1;
  } else if (sortBy !== 'updatedAt') {
    sort.updatedAt = -1;
  }
  return sort;
}

function serializeCommunityRecipe(doc) {
  if (!doc) return null;
  const author = doc.author;
  let authorPreview = null;
  if (author && typeof author === 'object') {
    authorPreview = {
      _id: author._id,
      firstName: author.firstName,
      lastName: author.lastName,
    };
  }
  return {
    _id: doc._id,
    recipeKey: doc.recipeKey,
    title: doc.title,
    ingredients: doc.ingredients,
    instructions: doc.instructions,
    likes: doc.likes,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
    author: authorPreview,
  };
}

class CommunityRecipeController {
  /**
   * Public list of approved (published) community recipes.
   * Query: page, limit (default 20, max 50), sortBy (createdAt|updatedAt|likes|title), order (asc|desc)
   */
  static async getCommunityRecipes(req, res) {
    try {
      const page = parsePositiveInt(req.query.page, 1);
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, parsePositiveInt(req.query.limit, DEFAULT_LIMIT) || DEFAULT_LIMIT)
      );

      const requestedSort = String(req.query.sortBy || '').trim();
      const sortField = SORT_FIELDS.has(requestedSort) ? requestedSort : 'updatedAt';
      const sort = resolveSort(sortField, req.query.order);
      const orderNorm =
        String(req.query.order || '')
          .trim()
          .toLowerCase() === 'asc'
          ? 'asc'
          : 'desc';

      const filter = { status: 'published' };

      const [total, rows] = await Promise.all([
        Recipe.countDocuments(filter),
        Recipe.find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .populate({ path: 'author', select: 'firstName lastName' })
          .lean({ virtuals: true }),
      ]);

      const totalPages = Math.max(1, Math.ceil(total / limit));

      res.status(200).json({
        recipes: rows.map(serializeCommunityRecipe),
        page,
        limit,
        total,
        totalPages,
        sortBy: sortField,
        order: orderNorm,
      });
    } catch (error) {
      console.error('get community recipes error:', error);
      res.status(500).json({ message: 'Could not load community recipes' });
    }
  }
}

module.exports = CommunityRecipeController;
