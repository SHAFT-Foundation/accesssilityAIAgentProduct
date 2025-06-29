'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Activity,
  AlertTriangle,
  CheckCircle,
  GitPullRequest,
  Clock,
  Target,
  Zap,
  Users,
  Globe,
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsData {
  overview: {
    totalScans: number;
    totalIssues: number;
    resolvedIssues: number;
    avgResolutionTime: number;
    scanSuccessRate: number;
    totalRepositories: number;
    activeRepositories: number;
    totalPullRequests: number;
    mergedPullRequests: number;
  };
  trends: {
    scansOverTime: Array<{ date: string; scans: number; issues: number; }>;
    issuesOverTime: Array<{ date: string; created: number; resolved: number; }>;
    repositoryGrowth: Array<{ date: string; total: number; active: number; }>;
    resolutionTimes: Array<{ date: string; avgTime: number; }>;
  };
  breakdown: {
    issuesBySeverity: Array<{ severity: string; count: number; percentage: number; }>;
    issuesByType: Array<{ type: string; count: number; percentage: number; }>;
    repositoriesByLanguage: Array<{ language: string; count: number; percentage: number; }>;
    scansByStatus: Array<{ status: string; count: number; percentage: number; }>;
  };
  performance: {
    topRepositories: Array<{
      id: string;
      name: string;
      fullName: string;
      totalScans: number;
      totalIssues: number;
      resolvedIssues: number;
      resolutionRate: number;
      lastScanAt: Date;
    }>;
    recentImprovements: Array<{
      repository: string;
      issuesResolved: number;
      improvementPercentage: number;
      period: string;
    }>;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'scans' | 'issues' | 'repositories'>('scans');

  const analytics = useAnalytics();

  useEffect(() => {
    analytics.page('/dashboard/analytics', 'Analytics Dashboard');
    loadAnalyticsData();
  }, [analytics, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      // Mock data - replace with actual API call
      const mockData: AnalyticsData = {
        overview: {
          totalScans: 127,
          totalIssues: 486,
          resolvedIssues: 412,
          avgResolutionTime: 3.2, // days
          scanSuccessRate: 94.5,
          totalRepositories: 12,
          activeRepositories: 8,
          totalPullRequests: 67,
          mergedPullRequests: 58,
        },
        trends: {
          scansOverTime: [
            { date: '2024-01-01', scans: 8, issues: 32 },
            { date: '2024-01-02', scans: 12, issues: 48 },
            { date: '2024-01-03', scans: 6, issues: 24 },
            { date: '2024-01-04', scans: 15, issues: 67 },
            { date: '2024-01-05', scans: 10, issues: 41 },
            { date: '2024-01-06', scans: 18, issues: 73 },
            { date: '2024-01-07', scans: 14, issues: 56 },
          ],
          issuesOverTime: [
            { date: '2024-01-01', created: 32, resolved: 28 },
            { date: '2024-01-02', created: 48, resolved: 35 },
            { date: '2024-01-03', created: 24, resolved: 42 },
            { date: '2024-01-04', created: 67, resolved: 51 },
            { date: '2024-01-05', created: 41, resolved: 38 },
            { date: '2024-01-06', created: 73, resolved: 65 },
            { date: '2024-01-07', created: 56, resolved: 48 },
          ],
          repositoryGrowth: [
            { date: '2024-01-01', total: 3, active: 2 },
            { date: '2024-01-02', total: 5, active: 4 },
            { date: '2024-01-03', total: 7, active: 5 },
            { date: '2024-01-04', total: 9, active: 7 },
            { date: '2024-01-05', total: 10, active: 8 },
            { date: '2024-01-06', total: 11, active: 8 },
            { date: '2024-01-07', total: 12, active: 8 },
          ],
          resolutionTimes: [
            { date: '2024-01-01', avgTime: 4.2 },
            { date: '2024-01-02', avgTime: 3.8 },
            { date: '2024-01-03', avgTime: 3.1 },
            { date: '2024-01-04', avgTime: 2.9 },
            { date: '2024-01-05', avgTime: 3.2 },
            { date: '2024-01-06', avgTime: 2.7 },
            { date: '2024-01-07', avgTime: 3.2 },
          ],
        },
        breakdown: {
          issuesBySeverity: [
            { severity: 'Critical', count: 48, percentage: 9.9 },
            { severity: 'Major', count: 134, percentage: 27.6 },
            { severity: 'Minor', count: 201, percentage: 41.4 },
            { severity: 'Info', count: 103, percentage: 21.2 },
          ],
          issuesByType: [
            { type: 'Missing Alt Text', count: 89, percentage: 18.3 },
            { type: 'Color Contrast', count: 76, percentage: 15.6 },
            { type: 'Heading Structure', count: 67, percentage: 13.8 },
            { type: 'Form Labels', count: 54, percentage: 11.1 },
            { type: 'Focus Management', count: 43, percentage: 8.8 },
            { type: 'ARIA Labels', count: 38, percentage: 7.8 },
            { type: 'Keyboard Navigation', count: 32, percentage: 6.6 },
            { type: 'Other', count: 87, percentage: 17.9 },
          ],
          repositoriesByLanguage: [
            { language: 'TypeScript', count: 5, percentage: 41.7 },
            { language: 'JavaScript', count: 4, percentage: 33.3 },
            { language: 'HTML', count: 2, percentage: 16.7 },
            { language: 'Python', count: 1, percentage: 8.3 },
          ],
          scansByStatus: [
            { status: 'Completed', count: 120, percentage: 94.5 },
            { status: 'Failed', count: 5, percentage: 3.9 },
            { status: 'Processing', count: 2, percentage: 1.6 },
          ],
        },
        performance: {
          topRepositories: [
            {
              id: '1',
              name: 'my-awesome-website',
              fullName: 'demo-user/my-awesome-website',
              totalScans: 45,
              totalIssues: 123,
              resolvedIssues: 108,
              resolutionRate: 87.8,
              lastScanAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            },
            {
              id: '2',
              name: 'e-commerce-site',
              fullName: 'demo-company/e-commerce-site',
              totalScans: 38,
              totalIssues: 156,
              resolvedIssues: 134,
              resolutionRate: 85.9,
              lastScanAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            },
            {
              id: '3',
              name: 'marketing-site',
              fullName: 'demo-company/marketing-site',
              totalScans: 28,
              totalIssues: 89,
              resolvedIssues: 78,
              resolutionRate: 87.6,
              lastScanAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
          ],
          recentImprovements: [
            {
              repository: 'demo-user/my-awesome-website',
              issuesResolved: 15,
              improvementPercentage: 23.4,
              period: 'Last 7 days',
            },
            {
              repository: 'demo-company/e-commerce-site',
              issuesResolved: 12,
              improvementPercentage: 18.7,
              period: 'Last 7 days',
            },
            {
              repository: 'demo-company/marketing-site',
              issuesResolved: 8,
              improvementPercentage: 12.1,
              period: 'Last 7 days',
            },
          ],
        },
      };

      setData(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getMetricTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change > 0,
      isNegative: change < 0,
    };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load analytics</h3>
          <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="mt-1 text-sm text-gray-600">
              Comprehensive insights into your accessibility scanning performance
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalScans}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">12.5% vs last month</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Issues Found</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.totalIssues}</p>
              <div className="flex items-center mt-1">
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">8.3% vs last month</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {((data.overview.resolvedIssues / data.overview.totalIssues) * 100).toFixed(1)}%
              </p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">15.2% vs last month</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-gray-900">{data.overview.avgResolutionTime}d</p>
              <div className="flex items-center mt-1">
                <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">0.8d faster</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trends Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Scanning Trends</h3>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="text-sm border-gray-300 rounded-md"
              >
                <option value="scans">Scans</option>
                <option value="issues">Issues</option>
                <option value="repositories">Repositories</option>
              </select>
            </div>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-end justify-between space-x-2">
              {data.trends.scansOverTime.map((point, index) => {
                const maxValue = Math.max(...data.trends.scansOverTime.map(p => p.scans));
                const height = (point.scans / maxValue) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                      style={{ height: `${height}%` }}
                      title={`${point.scans} scans on ${point.date}`}
                    />
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Issue Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Issues by Severity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.breakdown.issuesBySeverity.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      item.severity === 'Critical' ? 'bg-red-500' :
                      item.severity === 'Major' ? 'bg-yellow-500' :
                      item.severity === 'Minor' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900">{item.severity}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{item.count}</span>
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.severity === 'Critical' ? 'bg-red-500' :
                          item.severity === 'Major' ? 'bg-yellow-500' :
                          item.severity === 'Minor' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Issues */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Issue Types</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.breakdown.issuesByType.slice(0, 6).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.type}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mr-3">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Repositories */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Repositories</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {data.performance.topRepositories.map((repo, index) => (
              <div key={repo.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{repo.name}</p>
                    <p className="text-xs text-gray-500">{repo.fullName}</p>
                    <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                      <span>{repo.totalScans} scans</span>
                      <span>{repo.resolvedIssues}/{repo.totalIssues} resolved</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {repo.resolutionRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(repo.lastScanAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Improvements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Improvements</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {data.performance.recentImprovements.map((improvement, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {improvement.repository.split('/')[1]}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {improvement.issuesResolved} issues resolved
                    </p>
                    <p className="text-xs text-gray-500">{improvement.period}</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm font-semibold">
                      +{improvement.improvementPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}