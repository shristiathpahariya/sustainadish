/**
 * Backfills User contribution and reputation defaults; syncs indexes.
 * Run: npm run migrate:user-contributions
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sustainadish';

async function migrate() {
  await mongoose.connect(dbURI);
  console.log('Connected to MongoDB');

  const backfill = await User.collection.updateMany(
    {},
    [
      {
        $set: {
          recipesSubmittedCount: { $ifNull: ['$recipesSubmittedCount', 0] },
          recipesApprovedCount: { $ifNull: ['$recipesApprovedCount', 0] },
          recipeLikesReceived: { $ifNull: ['$recipeLikesReceived', 0] },
          reputationScore: { $ifNull: ['$reputationScore', 0] },
          reputationTier: { $ifNull: ['$reputationTier', 'bronze'] },
          lastContributionAt: { $ifNull: ['$lastContributionAt', null] },
        },
      },
    ]
  );
  console.log(
    `Backfill: matched ${backfill.matchedCount}, modified ${backfill.modifiedCount}`
  );

  const indexResult = await User.syncIndexes();
  console.log('Indexes synced:', indexResult);

  await mongoose.disconnect();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
