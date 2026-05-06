const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');
const AdminReviewController = require('../controllers/adminReviewController');

router.get(
  '/admin/recipes/pending',
  authMiddleware,
  requireAdmin,
  AdminReviewController.getPendingReviews
);

router.post(
  '/admin/recipes/:recipeId/approve',
  authMiddleware,
  requireAdmin,
  AdminReviewController.approveRecipe
);

router.post(
  '/admin/recipes/:recipeId/reject',
  authMiddleware,
  requireAdmin,
  AdminReviewController.rejectRecipe
);

module.exports = router;

