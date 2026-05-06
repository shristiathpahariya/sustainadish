/**
 * Exports approved recipes (status=published) into a CSV for training.
 * Run:
 *   npm run export:training-data
 *   npm run export:training-data -- --out ./exports/recipes.csv --limit 10000
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { exportApprovedRecipesToCsv } = require('../services/dataExtractionService');

const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sustainadish';

function parseArgs(argv) {
  const args = { out: '', limit: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out' && typeof argv[i + 1] === 'string') {
      args.out = argv[i + 1];
      i += 1;
    } else if (a === '--limit' && typeof argv[i + 1] === 'string') {
      const n = parseInt(argv[i + 1], 10);
      args.limit = Number.isFinite(n) && n > 0 ? n : null;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mongoose.connect(dbURI);
  console.log('Connected to MongoDB');

  const result = await exportApprovedRecipesToCsv({
    outputPath: args.out || undefined,
    limit: args.limit || undefined,
  });

  console.log(`\nExported ${result.rowCount} recipes to: ${result.outputPath}\n`);
  console.log('Training stats:', JSON.stringify(result.stats, null, 2));

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

