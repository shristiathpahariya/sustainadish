const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const SharedRecipeController = require('../controllers/sharedRecipeController');

router.post('/recipes/share', authMiddleware, SharedRecipeController.shareRecipe);
router.post('/recipes/:recipeId/like', authMiddleware, SharedRecipeController.likeRecipe);
router.get('/recipes/liked-ids', authMiddleware, SharedRecipeController.getLikedRecipeIds);

module.exports = router;
