const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const mongoose = require('mongoose');

const TrainingLog = require('../models/TrainingLog');
const Recipe = require('../models/Recipe');
const { exportApprovedRecipesToCsv, extractApprovedRecipes } = require('./dataExtractionService');
const modelVersionService = require('./modelVersionService');

function nowIsoCompact() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getPythonCmd() {
  return process.env.PYTHON && String(process.env.PYTHON).trim()
    ? String(process.env.PYTHON).trim()
    : 'python';
}

function resolveNextVersion(modelId, bump) {
  const active = modelVersionService.readActivePointer();
  const installed = modelVersionService.listInstalledVersions(modelId);

  const base =
    (active && active.modelId === modelId && active.version) ||
    (installed.length ? installed[installed.length - 1] : '1.0.0');

  return modelVersionService.incrementSemanticVersion(base, bump);
}

/**
 * End-to-end retraining pipeline:
 * - export approved recipes to CSV
 * - run python trainer to generate pickles
 * - save artifacts to new model version folder
 * - update active pointer
 * - write TrainingLog run with stats + paths
 *
 * @param {{
 *   modelId?: string,
 *   bump?: 'major'|'minor'|'patch',
 *   limit?: number,
 *   activate?: boolean,
 *   maxFeatures?: number,
 *   notes?: string
 * }} [opts]
 */
async function runFullRetrain(opts = {}) {
  const modelId = opts.modelId || modelVersionService.DEFAULT_MODEL_ID;
  const bump = opts.bump || 'patch';
  const activate = opts.activate !== false;
  const maxFeatures =
    typeof opts.maxFeatures === 'number' && opts.maxFeatures > 0
      ? Math.floor(opts.maxFeatures)
      : 2000;

  const startedAt = new Date();
  const version = resolveNextVersion(modelId, bump);
  const runKey = `${modelId}-v${version}-${nowIsoCompact()}`;

  const backendRoot = path.join(__dirname, '..');
  const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sustainadish';

  const versionDir = modelVersionService.ensureVersionDirectory(version, modelId);
  const exportDir = path.join(backendRoot, 'exports');
  fs.mkdirSync(exportDir, { recursive: true });
  const csvPath = path.join(exportDir, `training-data-${runKey}.csv`);

  // Ensure MongoDB connection is active (main server manages connection)
  if (mongoose.connection.readyState !== 1) {
    console.log('MongoDB not connected, connecting...');
    await mongoose.connect(dbURI);
  }

  let logDoc = null;
  try {
    logDoc = await TrainingLog.create({
      runKey,
      modelName: modelId,
      modelVersion: version,
      status: 'running',
      notes: (opts.notes || '').slice(0, 5000),
      metrics: {
        bump,
        activate,
        maxFeatures,
      },
      progress: {
        currentStep: 'extracting_recipes',
        overallProgress: 5,
        currentStepStartedAt: new Date(),
      },
    });

    // First, extract recipes to get their IDs (needed for trainingStatus update)
    console.log('Extracting approved recipes...');
    await TrainingLog.findByIdAndUpdate(logDoc._id, {
      $set: {
        'progress.currentStep': 'extracting_recipes',
        'progress.progressStep': 20,
        'progress.currentStepStartedAt': new Date(),
      },
    });
    const { recipes: approvedRecipes, stats: recipeStats } = await extractApprovedRecipes({ limit: opts.limit });
    const recipeIds = approvedRecipes.map(r => r._id);
    console.log(`Found ${recipeIds.length} recipes for training`);

    // Update progress after extraction
    await TrainingLog.findByIdAndUpdate(logDoc._id, {
      $set: {
        'progress.currentStep': 'exporting_csv',
        'progress.stepProgress': 40,
        'progress.overallProgress': 20,
        'progress.stepsCompleted': ['extracting_recipes'],
        'progress.currentStepStartedAt': new Date(),
      },
    });

    // Then export to CSV for training
    console.log('Exporting recipes to CSV...');
    const exportResult = await exportApprovedRecipesToCsv({
      outputPath: csvPath,
      limit: opts.limit,
    });

    const py = getPythonCmd();
    const trainerPath = path.join(backendRoot, 'retrain_model.py');

    const pyArgs = [
      trainerPath,
      '--csv',
      csvPath,
      '--version',
      version,
      '--modelId',
      modelId,
      '--max_features',
      String(maxFeatures),
    ];
    if (typeof opts.limit === 'number' && opts.limit > 0) {
      pyArgs.push('--limit', String(Math.floor(opts.limit)));
    }

    // Update progress before training
    await TrainingLog.findByIdAndUpdate(logDoc._id, {
      $set: {
        'progress.currentStep': 'training_model',
        'progress.stepProgress': 60,
        'progress.overallProgress': 40,
        'progress.stepsCompleted': ['extracting_recipes', 'exporting_csv'],
        'progress.currentStepStartedAt': new Date(),
      },
    });

    console.log(`[RETRAIN] Using Python: ${py}`);
    console.log(`[RETRAIN] PYTHON env var: ${process.env.PYTHON}`);

    const pyRun = spawnSync(py, pyArgs, {
      cwd: backendRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    });

    if (pyRun.status !== 0) {
      const stderr = (pyRun.stderr || '').trim();
      const stdout = (pyRun.stdout || '').trim();
      throw new Error(
        `Python trainer failed (exit ${pyRun.status}).\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`
      );
    }

    // Update progress after training completes
    await TrainingLog.findByIdAndUpdate(logDoc._id, {
      $set: {
        'progress.currentStep': 'saving_artifacts',
        'progress.stepProgress': 80,
        'progress.overallProgress': 70,
        'progress.stepsCompleted': ['extracting_recipes', 'exporting_csv', 'training_model'],
        'progress.currentStepStartedAt': new Date(),
      },
    });

    if (activate) {
      modelVersionService.setActiveVersion(version, modelId);
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    const artifacts = modelVersionService.ARTIFACT_FILENAMES.map((name) =>
      path.join(versionDir, name)
    );

    const updated = await TrainingLog.findByIdAndUpdate(
      logDoc._id,
      {
        $set: {
          status: 'completed',
          finishedAt,
          durationMs,
          sampleCount: exportResult.stats.total,
          progress: {
            currentStep: 'completed',
            stepProgress: 100,
            overallProgress: 100,
            stepsCompleted: ['extracting_recipes', 'exporting_csv', 'training_model', 'saving_artifacts', 'updating_status'],
          },
          metrics: {
            ...((logDoc.metrics && typeof logDoc.metrics === 'object') ? logDoc.metrics : {}),
            extractionStats: exportResult.stats,
            csvPath,
            versionDir,
            artifacts,
            python: py,
          },
        },
      },
      { new: true }
    ).lean();

    // Update trainingStatus for all recipes included in this training run
    console.log(`Updating trainingStatus for ${recipeIds.length} recipes...`);
    await TrainingLog.findByIdAndUpdate(logDoc._id, {
      $set: {
        'progress.currentStep': 'updating_status',
        'progress.stepProgress': 95,
        'progress.overallProgress': 90,
        'progress.stepsCompleted': ['extracting_recipes', 'exporting_csv', 'training_model', 'saving_artifacts'],
        'progress.currentStepStartedAt': new Date(),
      },
    });
    try {
      const updateResult = await Recipe.updateMany(
        { _id: { $in: recipeIds } },
        { $set: { trainingStatus: 'included' } }
      );
      console.log(`✓ Updated ${updateResult.modifiedCount} recipes to 'included' status`);

      // Set any remaining published recipes with 'pending' status to 'excluded'
      const excludedResult = await Recipe.updateMany(
        { status: 'published', trainingStatus: 'pending' },
        { $set: { trainingStatus: 'excluded' } }
      );
      console.log(`✓ Set ${excludedResult.modifiedCount} recipes to 'excluded' status`);
    } catch (updateError) {
      console.error('Error updating trainingStatus:', updateError);
      // Don't fail the training, just log the error
    }

    // Don't disconnect - connection is managed by the main server
    // await mongoose.disconnect();

    return {
      ok: true,
      runKey,
      modelId,
      version,
      active: activate ? modelVersionService.readActivePointer() : null,
      csvPath,
      versionDir,
      artifacts,
      trainingLogId: String(updated?._id || logDoc._id),
      stats: exportResult.stats,
    };
  } catch (err) {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    if (logDoc?._id) {
      await TrainingLog.findByIdAndUpdate(logDoc._id, {
        $set: {
          status: 'failed',
          finishedAt,
          durationMs,
          errorMessage: String(err && err.message ? err.message : err).slice(0, 10000),
        },
      });
    }

    // Don't disconnect on error - connection is managed by the main server
    // await mongoose.disconnect();
    throw err;
  }
}

module.exports = {
  runFullRetrain,
};

