/**
 * Ensures one bootstrap TrainingLog exists (idempotent).
 * Run: npm run seed:training-log
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const TrainingLog = require('../models/TrainingLog');

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sustainadish';

const BOOTSTRAP_RUN_KEY = 'bootstrap-schema-v1';

async function seed() {
  await mongoose.connect(dbURI);
  console.log('Connected to MongoDB');

  await TrainingLog.syncIndexes();

  const existing = await TrainingLog.findOne({ runKey: BOOTSTRAP_RUN_KEY }).lean();
  if (existing) {
    console.log('Bootstrap training log already present:', existing._id);
    await mongoose.disconnect();
    console.log('Done.');
    return;
  }

  const doc = await TrainingLog.create({
    runKey: BOOTSTRAP_RUN_KEY,
    modelName: 'recipe-recommender',
    modelVersion: '0.0.0',
    status: 'completed',
    notes: 'Schema bootstrap entry; replace with real training runs from your pipeline.',
    metrics: {
      message: 'No model was trained — this row exists to initialize the traininglogs collection.',
    },
    durationMs: 0,
    sampleCount: 0,
    finishedAt: new Date(),
  });

  console.log('Created first training log:', doc._id);
  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
