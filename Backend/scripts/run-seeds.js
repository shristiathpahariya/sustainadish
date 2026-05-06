/**
 * Runs all database seeds in order.
 * Run from Backend: npm run seed
 */
const path = require('path');
const { spawnSync } = require('child_process');

const SEEDS = ['seed-training-log.js'];

const backendRoot = path.join(__dirname, '..');
const node = process.execPath;

for (const file of SEEDS) {
  const scriptPath = path.join(__dirname, file);
  console.log(`\n--- Seed: ${file} ---\n`);
  const result = spawnSync(node, [scriptPath], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status == null ? 1 : result.status);
  }
}

console.log('\nAll seeds completed successfully.\n');
