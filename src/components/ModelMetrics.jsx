import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw,
  Database,
  Brain,
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Download,
} from 'lucide-react';
import { apiClient, mlApiUrl } from '../config';
import './ModelMetrics.css';

/**
 * ModelMetrics Component - Admin Dashboard for Model Training & User Contributions
 *
 * Features:
 * - Bar chart showing last 10 training runs with duration and sample count
 * - Line chart showing daily recipe submissions over last 30 days
 * - Statistics cards for quick overview
 * - Last training timestamp display
 * - Manual retrain button
 */

const ModelMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [quickStats, setQuickStats] = useState(null);
  const [wordFrequencies, setWordFrequencies] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);
  const [retrainError, setRetrainError] = useState(null);

  // Fetch metrics on mount
  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryResponse, quickStatsResponse] = await Promise.all([
        apiClient.get('/metrics/summary'),
        apiClient.get('/metrics/quick-stats'),
      ]);
      setMetrics(summaryResponse.data);
      setQuickStats(quickStatsResponse.data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to load metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWordFrequencies = async () => {
    try {
      const response = await fetch(`${mlApiUrl}/word-frequencies?top=30`);
      if (response.ok) {
        const data = await response.json();
        setWordFrequencies(data);
      }
    } catch (err) {
      console.error('Failed to fetch word frequencies:', err);
    }
  };

  // Fetch metrics on mount
  useEffect(() => {
    fetchMetrics();
  }, []);

  // Fetch word frequencies on mount
  useEffect(() => {
    fetchWordFrequencies();
  }, []);

  const handleManualRetrain = async () => {
    try {
      setRetraining(true);
      setRetrainSuccess(false);
      setRetrainError(null);

      // Use the correct admin endpoint for manual retraining
      const response = await apiClient.post('/admin/retrain-model');

      if (response.data.success || response.data.ok) {
        setRetrainSuccess(true);
        // Refresh metrics after a short delay
        setTimeout(() => {
          fetchMetrics();
          setRetrainSuccess(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Retrain failed:', err);
      setRetrainError(
        err.response?.data?.error || err.response?.data?.message ||
        'Failed to start retraining. Please try again.'
      );
    } finally {
      setRetraining(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format duration in human-readable format
  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };

  // Prepare training history data for bar chart
  const getTrainingChartData = () => {
    if (!metrics?.trainingHistory) return [];
    return metrics.trainingHistory.map((t) => ({
      name: t.version,
      duration: t.durationMinutes || 0,
      samples: t.sampleCount || 0,
      status: t.status,
    }));
  };

  // Prepare contribution timeline data for line chart
  const getContributionChartData = () => {
    if (!metrics?.contributionTimeline?.timeline) return [];
    return metrics.contributionTimeline.timeline.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      count: d.count,
      likes: d.likes,
    }));
  };

  if (loading && !metrics) {
    return (
      <div className="metrics-container">
        <div className="metrics-loading">
          <RefreshCw className="animate-spin" size={48} />
          <p>Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="metrics-container">
        <div className="metrics-error">
          <AlertCircle size={48} />
          <p>{error}</p>
          <button onClick={fetchMetrics} className="metrics-btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Extract stats data
  const modelPerf = metrics?.modelPerformance?.overall || {};
  const contributionStats = metrics?.contributionTimeline?.summary || {};
  const lastTraining = metrics?.trainingHistory?.[0];
  const trainingChartData = getTrainingChartData();
  const contributionChartData = getContributionChartData();

  // Use quick-stats for accurate total likes (sums ALL likes across all recipes)
  const totalLikes = quickStats?.dataset?.totalLikes ?? contributionStats.totalLikes ?? 0;

  return (
    <div className="metrics-container">
      {/* Header */}
      <div className="metrics-header">
        <div>
          <h1 className="metrics-title">Model Training Dashboard</h1>
          <p className="metrics-subtitle">
            Monitor training runs, user contributions, and model performance
          </p>
        </div>
        <div className="metrics-actions">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="metrics-btn-secondary"
            title="Refresh metrics"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleManualRetrain}
            disabled={retraining}
            className="metrics-btn-primary"
            title="Manually trigger model retraining"
          >
            {retraining ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Retraining...
              </>
            ) : (
              <>
                <Play size={18} />
                Retrain Model
              </>
            )}
          </button>
        </div>
      </div>

      {/* Retrain Status Messages */}
      {retrainSuccess && (
        <div className="metrics-alert metrics-alert-success">
          <CheckCircle2 size={20} />
          <span>Retraining started successfully! Metrics will update automatically.</span>
        </div>
      )}
      {retrainError && (
        <div className="metrics-alert metrics-alert-error">
          <XCircle size={20} />
          <span>{retrainError}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="metrics-grid">
        <div className="metrics-card">
          <div className="metrics-card-icon metrics-card-blue">
            <Database size={28} />
          </div>
          <div className="metrics-card-content">
            <p className="metrics-card-label">Total Recipes</p>
            <p className="metrics-card-value">
              {contributionStats.totalContributions || 0}
            </p>
          </div>
        </div>

        <div className="metrics-card">
          <div className="metrics-card-icon metrics-card-green">
            <TrendingUp size={28} />
          </div>
          <div className="metrics-card-content">
            <p className="metrics-card-label">Total Likes</p>
            <p className="metrics-card-value">
              {totalLikes}
            </p>
          </div>
        </div>

        <div className="metrics-card">
          <div className="metrics-card-icon metrics-card-purple">
            <Brain size={28} />
          </div>
          <div className="metrics-card-content">
            <p className="metrics-card-label">Training Runs</p>
            <p className="metrics-card-value">{modelPerf.totalRuns || 0}</p>
          </div>
        </div>

        <div className="metrics-card">
          <div className="metrics-card-icon metrics-card-orange">
            <CheckCircle2 size={28} />
          </div>
          <div className="metrics-card-content">
            <p className="metrics-card-label">Success Rate</p>
            <p className="metrics-card-value">
              {modelPerf.successRate || '0'}%
            </p>
          </div>
        </div>

        <div className="metrics-card">
          <div className="metrics-card-icon metrics-card-teal">
            <AlertCircle size={28} />
          </div>
          <div className="metrics-card-content">
            <p className="metrics-card-label">Avg. Training Time</p>
            <p className="metrics-card-value">
              {modelPerf.avgDurationMinutes
                ? `${modelPerf.avgDurationMinutes} min`
                : 'N/A'}
            </p>
          </div>
        </div>

        <div className="metrics-card">
          <div className="metrics-card-icon metrics-card-pink">
            <TrendingUp size={28} />
          </div>
          <div className="metrics-card-content">
            <p className="metrics-card-label">Avg. Daily Contributions</p>
            <p className="metrics-card-value">
              {contributionStats.avgDaily || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="metrics-charts">
        {/* Training History Bar Chart */}
        <div className="metrics-chart-card">
          <div className="metrics-chart-header">
            <h2 className="metrics-chart-title">Training History (Last 10 Runs)</h2>
            <span className="metrics-chart-subtitle">Duration & Sample Count</span>
          </div>
          <div className="metrics-chart-content">
            {trainingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trainingChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="duration"
                    fill="#3b82f6"
                    name="Duration (min)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="samples"
                    fill="#10b981"
                    name="Sample Count"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="metrics-chart-empty">
                <p>No training history available</p>
              </div>
            )}
          </div>
        </div>

        {/* Contribution Timeline Line Chart */}
        <div className="metrics-chart-card">
          <div className="metrics-chart-header">
            <h2 className="metrics-chart-title">User Contributions</h2>
            <span className="metrics-chart-subtitle">Daily Recipe Submissions (30 Days)</span>
          </div>
          <div className="metrics-chart-content">
            {contributionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={contributionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Submissions"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="likes"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Likes"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="metrics-chart-empty">
                <p>No contribution data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Word Frequency Chart */}
        <div className="metrics-chart-card">
          <div className="metrics-chart-header">
            <h2 className="metrics-chart-title">Top Ingredient Words</h2>
            <span className="metrics-chart-subtitle">
              Most common ingredients in training data
              {wordFrequencies && ` (${wordFrequencies.total_unique_words} unique words)`}
            </span>
            <button
              onClick={fetchWordFrequencies}
              className="metrics-btn-small"
              title="Refresh word frequencies"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="metrics-chart-content">
            {wordFrequencies?.words && wordFrequencies.words.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={wordFrequencies.words} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Frequency', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="word"
                    width={100}
                    tick={{ fontSize: 11, width: 90 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`Count: ${value}`, 'Frequency']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="metrics-chart-empty">
                <p>No word frequency data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Training History Table */}
      <div className="metrics-table-card">
        <div className="metrics-table-header">
          <h2 className="metrics-table-title">Training Run Details</h2>
          <span className="metrics-table-subtitle">Recent training runs with full details</span>
        </div>
        {metrics?.trainingHistory?.length > 0 ? (
          <div className="metrics-table-wrapper">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Samples</th>
                  <th>Success</th>
                </tr>
              </thead>
              <tbody>
                {metrics.trainingHistory.map((training) => (
                  <tr key={training._id}>
                    <td>
                      <span className="metrics-table-badge metrics-table-badge-primary">
                        {training.version}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`metrics-table-badge ${
                          training.status === 'completed'
                            ? 'metrics-table-badge-success'
                            : training.status === 'running'
                            ? 'metrics-table-badge-warning'
                            : 'metrics-table-badge-error'
                        }`}
                      >
                        {training.status}
                      </span>
                    </td>
                    <td>{formatDate(training.startedAt)}</td>
                    <td>{formatDuration(training.durationMs)}</td>
                    <td>{training.sampleCount || 0}</td>
                    <td>
                      {training.status === 'completed' ? (
                        <CheckCircle2 size={20} className="metrics-table-icon-success" />
                      ) : (
                        <XCircle size={20} className="metrics-table-icon-error" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="metrics-table-empty">
            <p>No training history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelMetrics;