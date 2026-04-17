const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recipe', recipeSchema);
