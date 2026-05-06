/**
 * Runs the end-to-end retraining pipeline.
 * Run:
 *   npm run retrain:model
 *   npm run retrain:model -- --bump patch --limit 10000 --activate true --maxFeatures 2000
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { runFullRetrain } = require('../services/retrainingService');

function parseArgs(argv) {
  const out = {
    bump: 'patch',
    limit: null,
    activate: true,
    maxFeatures: 2000,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--bump' && typeof argv[i + 1] === 'string') {
      out.bump = argv[i + 1];
      i += 1;
    } else if (a === '--limit' && typeof argv[i + 1] === 'string') {
      const n = parseInt(argv[i + 1], 10);
      out.limit = Number.isFinite(n) && n > 0 ? n : null;
      i += 1;
    } else if (a === '--activate' && typeof argv[i + 1] === 'string') {
      out.activate = argv[i + 1].trim().toLowerCase() !== 'false';
      i += 1;
    } else if (a === '--maxFeatures' && typeof argv[i + 1] === 'string') {
      const n = parseInt(argv[i + 1], 10);
      out.maxFeatures = Number.isFinite(n) && n > 0 ? n : out.maxFeatures;
      i += 1;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runFullRetrain({
    bump: args.bump,
    limit: args.limit || undefined,
    activate: args.activate,
    maxFeatures: args.maxFeatures,
    notes: 'Automated retrain via npm script.',
  });

  console.log('\nRetraining completed:\n', JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

