/**
 * Backfills Recipe documents for user-submission fields and syncs indexes.
 * Run: npm run migrate:recipe
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sustainadish';

async function migrate() {
  await mongoose.connect(dbURI);
  console.log('Connected to MongoDB');

  const backfill = await Recipe.collection.updateMany(
    {},
    [
      {
        $set: {
          status: { $ifNull: ['$status', 'published'] },
          likes: { $ifNull: ['$likes', 0] },
          trainingStatus: { $ifNull: ['$trainingStatus', 'none'] },
        },
      },
    ]
  );
  console.log(
    `Backfill: matched ${backfill.matchedCount}, modified ${backfill.modifiedCount}`
  );

  const indexResult = await Recipe.syncIndexes();
  console.log('Indexes synced:', indexResult);

  await mongoose.disconnect();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
