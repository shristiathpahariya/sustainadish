const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const SavedRecipeController = require('../controllers/savedRecipeController');

router.post('/saved-recipes', authMiddleware, SavedRecipeController.save);
router.get('/saved-recipes', authMiddleware, SavedRecipeController.list);
router.get('/saved-recipe-keys', authMiddleware, SavedRecipeController.listKeys);
router.delete('/saved-recipes/recipe/:recipeId', authMiddleware, SavedRecipeController.remove);

module.exports = router;
