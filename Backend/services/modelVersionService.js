const fs = require('fs');
const path = require('path');

/** Default bundle id for recipe ML artifacts (matches Python `input/` filenames). */
const DEFAULT_MODEL_ID = 'recipe-recommender';

/** Files the Flask app loads from `input/` — version folders use the same names. */
const ARTIFACT_FILENAMES = [
  'combined_embeddings.pkl',
  'sampled_data.pkl',
  'tfidf_vectorizer.pkl',
];

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

function getVersionsRoot() {
  return process.env.ML_VERSIONS_ROOT
    ? path.resolve(process.env.ML_VERSIONS_ROOT)
    : path.join(__dirname, '..', 'ml_versions');
}

function getActivePointerPath() {
  return path.join(getVersionsRoot(), 'active.json');
}

function getModelRoot(modelId = DEFAULT_MODEL_ID) {
  return path.join(getVersionsRoot(), modelId);
}

/**
 * @param {string} version - e.g. "1.0.0" or "v1.0.0"
 * @returns {string} directory segment e.g. "v1.0.0"
 */
function toFolderName(version) {
  const v = parseSemanticVersion(version);
  return `v${v}`;
}

function parseSemanticVersion(version) {
  if (typeof version !== 'string' || !version.trim()) {
    throw new Error('Version must be a non-empty string');
  }
  const raw = version.trim().replace(/^v/i, '');
  const m = raw.match(SEMVER_RE);
  if (!m) {
    throw new Error(
      `Invalid semantic version "${version}" (expected MAJOR.MINOR.PATCH)`
    );
  }
  return raw;
}

function fromFolderName(dirName) {
  if (typeof dirName !== 'string' || !dirName.trim()) {
    throw new Error('Invalid folder name');
  }
  const raw = dirName.trim().replace(/^v/i, '');
  parseSemanticVersion(raw);
  return raw;
}

/** @returns {[number, number, number]} */
function semverToTuple(version) {
  const v = parseSemanticVersion(version);
  return v.split('.').map((n) => parseInt(n, 10));
}

/** @returns {number} negative if a<b, 0 if equal, positive if a>b */
function compareSemanticVersion(a, b) {
  const [ma, ia, pa] = semverToTuple(a);
  const [mb, ib, pb] = semverToTuple(b);
  if (ma !== mb) return ma - mb;
  if (ia !== ib) return ia - ib;
  return pa - pb;
}

/**
 * @param {string} version
 * @param {'major'|'minor'|'patch'} bump
 */
function incrementSemanticVersion(version, bump = 'patch') {
  const v = parseSemanticVersion(version);
  let [major, minor, patch] = semverToTuple(v);
  if (bump === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bump === 'minor') {
    minor += 1;
    patch = 0;
  } else if (bump === 'patch') {
    patch += 1;
  } else {
    throw new Error(`Invalid bump "${bump}" (use major, minor, or patch)`);
  }
  return `${major}.${minor}.${patch}`;
}

function getVersionDirectory(modelId, version) {
  return path.join(getModelRoot(modelId), toFolderName(version));
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

/**
 * Lists installed semver folders for a model, highest last.
 * @param {string} [modelId]
 * @returns {string[]} e.g. ['1.0.0','1.0.1']
 */
function listInstalledVersions(modelId = DEFAULT_MODEL_ID) {
  const root = getModelRoot(modelId);
  if (!fs.existsSync(root)) {
    return [];
  }
  const names = fs.readdirSync(root, { withFileTypes: true });
  const versions = [];
  for (const d of names) {
    if (!d.isDirectory()) continue;
    try {
      versions.push(fromFolderName(d.name));
    } catch {
      /* skip non-version dirs */
    }
  }
  versions.sort(compareSemanticVersion);
  return versions;
}

function readActivePointer() {
  const fp = getActivePointerPath();
  if (!fs.existsSync(fp)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!data || typeof data.modelId !== 'string' || typeof data.version !== 'string') {
      return null;
    }
    return {
      modelId: data.modelId,
      version: parseSemanticVersion(data.version),
      updatedAt: data.updatedAt || null,
    };
  } catch {
    return null;
  }
}

function writeActivePointer(modelId, version) {
  const v = parseSemanticVersion(version);
  ensureDir(getVersionsRoot());
  const payload = {
    modelId,
    version: v,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(getActivePointerPath(), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return payload;
}

/**
 * Activates a version folder (must exist).
 * @param {string} version
 * @param {string} [modelId]
 */
function setActiveVersion(version, modelId = DEFAULT_MODEL_ID) {
  const dir = getVersionDirectory(modelId, version);
  if (!fs.existsSync(dir)) {
    throw new Error(`Version directory does not exist: ${dir}`);
  }
  return writeActivePointer(modelId, parseSemanticVersion(version));
}

/**
 * Previous release strictly before `currentVersion`, or null.
 * @param {string} modelId
 * @param {string} currentVersion
 */
function getPreviousVersion(modelId, currentVersion) {
  const sorted = listInstalledVersions(modelId);
  const cur = parseSemanticVersion(currentVersion);
  let best = null;
  for (const v of sorted) {
    if (compareSemanticVersion(v, cur) < 0) {
      best = v;
    }
  }
  return best;
}

/**
 * Sets active pointer to the highest installed version strictly below the current active one.
 * @returns {object|null} new active payload or null if nothing to roll back to
 */
function rollbackActive(modelId = DEFAULT_MODEL_ID) {
  const active = readActivePointer();
  if (!active || active.modelId !== modelId) {
    throw new Error('No active pointer for this model');
  }
  const prev = getPreviousVersion(modelId, active.version);
  if (!prev) {
    return null;
  }
  return writeActivePointer(modelId, prev);
}

/**
 * Creates the version directory (and model root). Optional manifest sidecar.
 */
function ensureVersionDirectory(version, modelId = DEFAULT_MODEL_ID) {
  const dir = getVersionDirectory(modelId, version);
  ensureDir(dir);
  return dir;
}

/**
 * Copies standard artifacts from `Backend/input/` into a version folder (for promoting a build).
 * @param {string} version
 * @param {string} [modelId]
 * @param {string} [sourceDir] - defaults to Backend/input
 */
function copyArtifactsFromInput(
  version,
  modelId = DEFAULT_MODEL_ID,
  sourceDir = path.join(__dirname, '..', 'input')
) {
  const dest = ensureVersionDirectory(version, modelId);
  const copied = [];
  for (const name of ARTIFACT_FILENAMES) {
    const from = path.join(sourceDir, name);
    const to = path.join(dest, name);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, to);
      copied.push(name);
    }
  }
  return { dest, copied };
}

module.exports = {
  DEFAULT_MODEL_ID,
  ARTIFACT_FILENAMES,
  getVersionsRoot,
  getActivePointerPath,
  getModelRoot,
  getVersionDirectory,
  toFolderName,
  parseSemanticVersion,
  fromFolderName,
  compareSemanticVersion,
  incrementSemanticVersion,
  listInstalledVersions,
  readActivePointer,
  writeActivePointer,
  setActiveVersion,
  getPreviousVersion,
  rollbackActive,
  ensureVersionDirectory,
  copyArtifactsFromInput,
};
