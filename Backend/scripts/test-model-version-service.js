/**
 * Validates semver helpers (no filesystem required for core assertions).
 * Run: npm run test:model-version
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const svc = require('../services/modelVersionService');

function testSemverParsing() {
  assert.strictEqual(svc.parseSemanticVersion('1.0.0'), '1.0.0');
  assert.strictEqual(svc.parseSemanticVersion('v2.10.3'), '2.10.3');
}

function testIncrement() {
  assert.strictEqual(svc.incrementSemanticVersion('1.0.0', 'patch'), '1.0.1');
  assert.strictEqual(svc.incrementSemanticVersion('1.0.9', 'patch'), '1.0.10');
  assert.strictEqual(svc.incrementSemanticVersion('1.2.3', 'minor'), '1.3.0');
  assert.strictEqual(svc.incrementSemanticVersion('1.2.3', 'major'), '2.0.0');
}

function testCompareSort() {
  const sorted = ['1.0.0', '1.0.10', '1.0.2'].sort(svc.compareSemanticVersion);
  assert.deepStrictEqual(sorted, ['1.0.0', '1.0.2', '1.0.10']);
}

function testFilesystemLayout(tmpRoot) {
  process.env.ML_VERSIONS_ROOT = tmpRoot;
  const modelId = svc.DEFAULT_MODEL_ID;
  const mid = svc.getModelRoot(modelId);
  if (fs.existsSync(tmpRoot)) fs.rmSync(tmpRoot, { recursive: true });
  svc.ensureVersionDirectory('1.0.0');
  svc.ensureVersionDirectory('1.0.1');
  svc.setActiveVersion('1.0.1');
  assert.ok(fs.existsSync(path.join(mid, 'v1.0.0')));
  assert.ok(fs.existsSync(path.join(mid, 'v1.0.1')));
  const versions = svc.listInstalledVersions();
  assert.deepStrictEqual(versions, ['1.0.0', '1.0.1']);
  const active = svc.readActivePointer();
  assert.strictEqual(active.version, '1.0.1');
  const rolled = svc.rollbackActive();
  assert.strictEqual(rolled.version, '1.0.0');
}

try {
  testSemverParsing();
  testIncrement();
  testCompareSort();

  const tmpRoot = path.join(__dirname, '..', '.tmp-model-version-test');
  testFilesystemLayout(tmpRoot);
  fs.rmSync(tmpRoot, { recursive: true });
  delete process.env.ML_VERSIONS_ROOT;

  console.log('modelVersionService checks passed.');
} catch (e) {
  delete process.env.ML_VERSIONS_ROOT;
  console.error(e);
  process.exit(1);
}
