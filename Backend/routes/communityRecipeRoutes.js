const express = require('express');
const router = express.Router();
const CommunityRecipeController = require('../controllers/communityRecipeController');

router.get('/recipes/community', CommunityRecipeController.getCommunityRecipes);

module.exports = router;
