/**
 * Build preparation script for Render deployment
 * This ensures ML models are available before the app starts
 * Run during the build phase
 */

const fs = require('fs');
const path = require('path');

function ensureDirectories() {
  const dirs = [
    'exports',
    'input',
    'ml_versions/recipe-recommender',
    'ml_versions/_backups'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
}

function ensureSampleDataCsv() {
  const csvPath = path.join(__dirname, '..', 'exports', 'data.csv');

  // Only create if it doesn't exist
  if (!fs.existsSync(csvPath)) {
    const sampleData = `title,ingredients,instructions
Sample Recipe 1,tomato,onion,pepper,Cut all vegetables into small pieces and mix them together in a bowl. Serve fresh.
Sample Recipe 2,chicken,rice,vegetables,seasonings,Cook rice according to package instructions. Grill chicken with seasonings and vegetables. Serve over rice.`;

    fs.writeFileSync(csvPath, sampleData, 'utf8');
    console.log('✓ Created sample exports/data.csv');
  } else {
    console.log('✓ exports/data.csv already exists');
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    'input/combined_embeddings.pkl',
    'input/tfidf_vectorizer.pkl',
    'input/sampled_data.pkl',
    'input/sampled_data.json'
  ];

  const missingFiles = [];
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length === 0) {
    console.log('\n✓ All required ML model files exist');
    return true;
  } else {
    console.log('\n⚠ Missing ML model files:');
    missingFiles.forEach(file => console.log(`  - ${file}`));
    console.log('\nThe app will still start but ML features may not work properly.');
    console.log('You can train the models by running: npm run retrain:model');
    return false;
  }
}

function main() {
  console.log('🔧 Build preparation for SustainaDish Backend\n');

  ensureDirectories();
  ensureSampleDataCsv();
  checkRequiredFiles();

  console.log('\n✓ Build preparation complete');
}

main();