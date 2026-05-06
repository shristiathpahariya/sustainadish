/**
 * Runs all database migrations in order.
 * Run from Backend: npm run migrate
 */
const path = require('path');
const { spawnSync } = require('child_process');

const MIGRATIONS = ['migrate-recipe-schema.js', 'migrate-user-contributions.js'];

const backendRoot = path.join(__dirname, '..');
const node = process.execPath;

for (const file of MIGRATIONS) {
  const scriptPath = path.join(__dirname, file);
  console.log(`\n--- Migration: ${file} ---\n`);
  const result = spawnSync(node, [scriptPath], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status == null ? 1 : result.status);
  }
}

console.log('\nAll migrations completed successfully.\n');
