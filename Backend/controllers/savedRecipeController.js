const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const SavedRecipe = require('../models/SavedRecipe');
const { buildRecipeKey } = require('../utils/recipeKey');

function serializeRecipe(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: o._id,
    recipeKey: o.recipeKey,
    title: o.title,
    ingredients: o.ingredients,
    instructions: o.instructions,
    updatedAt: o.updatedAt,
  };
}

class SavedRecipeController {
  static async save(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      const { ingredients, instructions } = req.body;

      if (!title) {
        return res.status(400).json({ message: 'Title is required' });
      }
      if (ingredients == null) {
        return res.status(400).json({ message: 'Ingredients are required' });
      }
      if (Array.isArray(ingredients) && ingredients.length === 0) {
        return res.status(400).json({ message: 'Ingredients cannot be empty' });
      }
      if (typeof ingredients === 'string' && !ingredients.trim()) {
        return res.status(400).json({ message: 'Ingredients cannot be empty' });
      }

      const recipeKey = buildRecipeKey(title, ingredients);
      const instructionsStr =
        typeof instructions === 'string' ? instructions : String(instructions ?? '');

      const recipe = await Recipe.findOneAndUpdate(
        { recipeKey },
        {
          $set: {
            title,
            ingredients,
            instructions: instructionsStr,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );

      try {
        await SavedRecipe.create({
          user: userId,
          recipe: recipe._id,
        });
        return res.status(201).json({
          saved: true,
          alreadySaved: false,
          recipe: serializeRecipe(recipe),
        });
      } catch (err) {
        if (err.code === 11000) {
          return res.status(200).json({
            saved: true,
            alreadySaved: true,
            recipe: serializeRecipe(recipe),
          });
        }
        throw err;
      }
    } catch (error) {
      console.error('save recipe error:', error);
      res.status(500).json({ message: 'Could not save recipe' });
    }
  }

  static async list(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const rows = await SavedRecipe.find({ user: userId })
        .populate('recipe')
        .sort({ createdAt: -1 })
        .lean();

      const savedRecipes = rows
        .filter((row) => row.recipe)
        .map((row) => ({
          _id: row._id,
          savedAt: row.createdAt,
          recipe: serializeRecipe(row.recipe),
        }));

      res.status(200).json({ savedRecipes });
    } catch (error) {
      console.error('list saved recipes error:', error);
      res.status(500).json({ message: 'Could not load saved recipes' });
    }
  }

  static async listKeys(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const rows = await SavedRecipe.find({ user: userId })
        .populate({ path: 'recipe', select: 'recipeKey' })
        .lean();

      const recipeKeys = rows
        .map((row) => row.recipe && row.recipe.recipeKey)
        .filter(Boolean);

      res.status(200).json({ recipeKeys });
    } catch (error) {
      console.error('list recipe keys error:', error);
      res.status(500).json({ message: 'Could not load saved recipe keys' });
    }
  }

  static async remove(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { recipeId } = req.params;
      if (!recipeId || !mongoose.Types.ObjectId.isValid(recipeId)) {
        return res.status(400).json({ message: 'Invalid recipe id' });
      }

      const deleted = await SavedRecipe.findOneAndDelete({
        user: userId,
        recipe: recipeId,
      });

      if (!deleted) {
        return res.status(404).json({ message: 'Saved recipe not found' });
      }

      res.status(200).json({ removed: true });
    } catch (error) {
      console.error('remove saved recipe error:', error);
      res.status(500).json({ message: 'Could not remove saved recipe' });
    }
  }
}

module.exports = SavedRecipeController;
