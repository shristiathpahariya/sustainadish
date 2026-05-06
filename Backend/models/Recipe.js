const mongoose = require('mongoose');

const RECIPE_STATUS = ['draft', 'pending', 'pending_review', 'published', 'rejected'];
const TRAINING_STATUS = ['none', 'pending', 'included', 'excluded'];

const recipeSchema = new mongoose.Schema(
  {
    recipeKey: {
      type: String,
      required: true,
      unique: true,
      maxlength: 64,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },
    ingredients: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    instructions: {
      type: String,
      default: '',
      maxlength: 200000,
    },
    status: {
      type: String,
      enum: RECIPE_STATUS,
      default: 'published',
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    likedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    moderation: {
      reviewedAt: { type: Date, default: null, index: true },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      rejectionReason: {
        type: String,
        trim: true,
        default: '',
        maxlength: 5000,
      },
    },
    trainingStatus: {
      type: String,
      enum: TRAINING_STATUS,
      default: 'none',
      index: true,
    },
  },
  { timestamps: true }
);

recipeSchema.index({ status: 1, updatedAt: -1 });
recipeSchema.index({ author: 1, status: 1 });
recipeSchema.index({ trainingStatus: 1, updatedAt: -1 });
recipeSchema.index({ status: 1, likes: -1 });

module.exports = mongoose.model('Recipe', recipeSchema);
