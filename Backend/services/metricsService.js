const TrainingLog = require('../models/TrainingLog');
const Recipe = require('../models/Recipe');

/**
 * Get recent training history with performance metrics
 * @param {number} limit - Number of recent training runs to return
 */
async function getTrainingHistory(limit = 10) {
  try {
    const limitNum = Math.max(Math.min(parseInt(limit, 10) || 10, 100), 1);

    const trainings = await TrainingLog.find({})
      .sort('-createdAt')
      .limit(limitNum)
      .lean();

    // Format response with computed metrics
    const formatted = trainings.map((t) => ({
      _id: t._id,
      runKey: t.runKey,
      modelId: t.modelName,
      version: t.modelVersion,
      status: t.status,
      startedAt: t.startedAt,
      finishedAt: t.finishedAt,
      durationMs: t.durationMs,
      durationMinutes: t.durationMs ? Math.round(t.durationMs / 60000, 2) : null,
      sampleCount: t.sampleCount,
      errorMessage: t.errorMessage,
      notes: t.notes,
      success: t.status === 'completed',
      failure: t.status === 'failed',
      createdAt: t.createdAt,
      // Extract nested metrics if available
      metrics: t.metrics || {},
      hasExtractionStats: !!(t.metrics && t.metrics.extractionStats),
    }));

    return {
      success: true,
      count: formatted.length,
      trainings: formatted,
    };
  } catch (error) {
    console.error('getTrainingHistory error:', error);
    throw new Error(`Failed to fetch training history: ${error.message}`);
  }
}

/**
 * Get model performance trends over time
 * Analyzes training runs to identify patterns
 */
async function getModelPerformance() {
  try {
    const trainings = await TrainingLog.find({
      status: { $in: ['completed', 'failed'] },
    })
      .sort('-createdAt')
      .limit(50)
      .lean();

    if (!trainings || trainings.length === 0) {
      return {
        success: true,
        hasData: false,
        message: 'No completed training runs found',
        trends: [],
      };
    }

    // Calculate trends by version
    const versionStats = {};
    trainings.forEach((t) => {
      const version = t.modelVersion;
      if (!versionStats[version]) {
        versionStats[version] = {
          version,
          runs: 0,
          successes: 0,
          failures: 0,
          avgDurationMs: 0,
          avgSampleCount: 0,
          totalDurationMs: 0,
          totalSampleCount: 0,
        };
      }

      const stats = versionStats[version];
      stats.runs += 1;
      stats.successes += t.status === 'completed' ? 1 : 0;
      stats.failures += t.status === 'failed' ? 1 : 0;

      if (t.durationMs) stats.totalDurationMs += t.durationMs;
      if (t.sampleCount) stats.totalSampleCount += t.sampleCount;
    });

    // Calculate averages
    Object.values(versionStats).forEach((v) => {
      v.avgDurationMs = v.runs > 0 ? Math.round(v.totalDurationMs / v.runs) : 0;
      v.avgSampleCount = v.runs > 0 ? Math.round(v.totalSampleCount / v.runs) : 0;
      v.successRate = v.runs > 0 ? (v.successes / v.runs * 100).toFixed(1) : 0;
    });

    // Convert to sorted array by version (newest first)
    const trends = Object.values(versionStats)
      .sort((a, b) => {
        const aParts = a.version.split('.').map(Number);
        const bParts = b.version.split('.').map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) return bVal - aVal; // Descending
        }
        return 0;
      });

    // Calculate overall stats
    const totalRuns = trainings.length;
    const totalSuccesses = trainings.filter((t) => t.status === 'completed').length;
    const totalFailures = trainings.filter((t) => t.status === 'failed').length;
    const avgDuration = trainings.reduce((sum, t) => sum + (t.durationMs || 0), 0) / totalRuns;
    const avgSampleCount = trainings.reduce((sum, t) => sum + (t.sampleCount || 0), 0) / totalRuns;

    return {
      success: true,
      hasData: true,
      overall: {
        totalRuns,
        totalSuccesses,
        totalFailures,
        successRate: ((totalSuccesses / totalRuns) * 100).toFixed(1),
        avgDurationMs: Math.round(avgDuration),
        avgDurationMinutes: Math.round(avgDuration / 60000, 2),
        avgSampleCount: Math.round(avgSampleCount),
      },
     ByVersion: trends,
      recentPerformance: trainings.slice(0, 10).map((t) => ({
        version: t.modelVersion,
        status: t.status,
        durationMs: t.durationMs,
        sampleCount: t.sampleCount,
        createdAt: t.createdAt,
      })),
    };
  } catch (error) {
    console.error('getModelPerformance error:', error);
    throw new Error(`Failed to fetch model performance: ${error.message}`);
  }
}

/**
 * Get user contribution timeline (daily user-submitted recipe counts)
 * @param {number} days - Number of days to look back
 */
async function getContributionTimeline(days = 30) {
  try {
    const daysNum = Math.max(Math.min(parseInt(days, 10) || 30, 365), 1);

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysNum);

    // Aggregate user-submitted recipes by day
    const dailyContributions = await Recipe.aggregate([
      {
        $match: {
          author: { $exists: true, $ne: null },
          createdAt: { $gte: dateThreshold },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
          likes: { $sum: { $ifNull: ['$likes', 0] } },
          uniqueAuthors: { $addToSet: '$author' },
        },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          day: '$_id.day',
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
            },
          },
          count: 1,
          likes: 1,
          uniqueAuthors: { $size: '$uniqueAuthors' },
        },
      },
      {
        $sort: { year: 1, month: 1, day: 1 },
      },
    ]);

    // Fill in missing days with zero counts
    const timeline = [];
    const currentDate = new Date(dateThreshold);
    const contributionMap = new Map();

    dailyContributions.forEach((item) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      contributionMap.set(dateKey, item);
    });

    for (let i = 0; i < daysNum; i++) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const data = contributionMap.get(dateKey) || {
        date: new Date(currentDate),
        count: 0,
        likes: 0,
        uniqueAuthors: 0,
      };

      timeline.push({
        date: data.date.toISOString(),
        formattedDate: dateKey,
        count: data.count,
        likes: data.likes,
        uniqueAuthors: data.uniqueAuthors,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate summary stats
    const totalContributions = timeline.reduce((sum, d) => sum + d.count, 0);
    const totalLikes = timeline.reduce((sum, d) => sum + d.likes, 0);
    const avgDaily = Math.round(totalContributions / daysNum, 2);
    const peakDay = timeline.reduce((max, d) => (d.count > max.count ? d : max), {
      count: 0,
      date: null,
    });
    const activeDays = timeline.filter((d) => d.count > 0).length;

    return {
      success: true,
      period: {
        startDate: dateThreshold.toISOString(),
        endDate: new Date().toISOString(),
        days: daysNum,
      },
      timeline,
      summary: {
        totalContributions,
        totalLikes,
        avgDaily,
        activeDays,
        peakDay: {
          date: peakDay.date,
          count: peakDay.count,
        },
        contributionRate: ((activeDays / daysNum) * 100).toFixed(1),
      },
    };
  } catch (error) {
    console.error('getContributionTimeline error:', error);
    throw new Error(`Failed to fetch contribution timeline: ${error.message}`);
  }
}

/**
 * Get comprehensive metrics summary (all data at once)
 */
async function getMetricsSummary() {
  try {
    const [trainingHistory, modelPerformance, contributionTimeline] = await Promise.all([
      getTrainingHistory(5),
      getModelPerformance(),
      getContributionTimeline(30),
    ]);

    return {
      success: true,
      fetchedAt: new Date().toISOString(),
      trainingHistory: trainingHistory.trainings,
      modelPerformance,
      contributionTimeline,
    };
  } catch (error) {
    console.error('getMetricsSummary error:', error);
    throw new Error(`Failed to fetch metrics summary: ${error.message}`);
  }
}

/**
 * Get quick stats for dashboard overview
 */
async function getQuickStats() {
  try {
    const [
      completedTrainings,
      recentTraining,
      totalCount,
      pendingTrainings,
    ] = await Promise.all([
      TrainingLog.countDocuments({ status: 'completed' }),
      TrainingLog.findOne({}).sort('-createdAt'),
      Recipe.countDocuments({}),
      TrainingLog.countDocuments({ status: 'running' }),
    ]);

    const userRecipes = await Recipe.countDocuments({
      author: { $exists: true, $ne: null },
    });

    const publishedRecipes = await Recipe.countDocuments({
      status: 'published',
      author: { $exists: true, $ne: null },
    });

    const totalLikes = await Recipe.aggregate([
      { $match: { likes: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$likes' } } },
    ]);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      dataset: {
        totalRecipes: totalCount,
        userRecipes,
        publishedRecipes,
        systemRecipes: totalCount - userRecipes,
        totalLikes: totalLikes[0]?.total || 0,
      },
      training: {
        completedTrainings,
        hasRecentlyTrained: !!recentTraining,
        lastTraining: recentTraining ? {
          version: recentTraining.modelVersion,
          status: recentTraining.status,
          startedAt: recentTraining.startedAt,
        } : null,
        pendingTrainings,
      },
    };
  } catch (error) {
    console.error('getQuickStats error:', error);
    throw new Error(`Failed to fetch quick stats: ${error.message}`);
  }
}

module.exports = {
  getTrainingHistory,
  getModelPerformance,
  getContributionTimeline,
  getMetricsSummary,
  getQuickStats,
};