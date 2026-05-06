const mongoose = require('mongoose');

const RUN_STATUS = ['running', 'completed', 'failed', 'cancelled'];

const trainingLogSchema = new mongoose.Schema(
  {
    runKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      unique: true,
      index: true,
    },
    modelName: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200,
    },
    modelVersion: {
      type: String,
      trim: true,
      default: '',
      maxlength: 64,
    },
    status: {
      type: String,
      enum: RUN_STATUS,
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      min: 0,
      default: null,
    },
    sampleCount: {
      type: Number,
      min: 0,
      default: null,
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 5000,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: '',
      maxlength: 10000,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

trainingLogSchema.index({ createdAt: -1 });
trainingLogSchema.index({ status: 1, startedAt: -1 });

module.exports = mongoose.model('TrainingLog', trainingLogSchema);
