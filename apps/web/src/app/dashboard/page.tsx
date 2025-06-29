'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  GitPullRequest,
  FolderGit2,
  ScanLine,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';

interface DashboardStats {
  totalRepositories: number;
  totalScans: number;
  totalIssues: number;
  totalPRs: number;
  activeScans: number;
  openIssues: number;
  openPRs: number;
  resolvedIssues: number;
  criticalIssues: number;
  scanSuccess: number;
  prMergeRate: number;
  issueResolutionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'scan_completed' | 'pr_created' | 'issue_resolved' | 'repo_added';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
  repository?: string;
  metadata?: Record<string, any>;
}

interface Repository {
  id: string;
  name: string;
  fullName: string;
  lastScanAt: Date | null;
  openIssues: number;
  criticalIssues: number;
  scanStatus: 'completed' | 'processing' | 'failed' | 'pending';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRepositories: 0,
    totalScans: 0,
    totalIssues: 0,
    totalPRs: 0,
    activeScans: 0,
    openIssues: 0,
    openPRs: 0,
    resolvedIssues: 0,
    criticalIssues: 0,
    scanSuccess: 0,
    prMergeRate: 0,
    issueResolutionRate: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  const analytics = useAnalytics();

  useEffect(() => {
    analytics.page('/dashboard', 'Dashboard Overview');
    loadDashboardData();
  }, [analytics]);

  const loadDashboardData = async () => {
    try {
      // Mock data - replace with actual API calls
      setStats({
        totalRepositories: 3,
        totalScans: 47,
        totalIssues: 156,
        totalPRs: 23,
        activeScans: 2,
        openIssues: 23,
        openPRs: 4,
        resolvedIssues: 133,
        criticalIssues: 8,
        scanSuccess: 94.7,
        prMergeRate: 87.2,
        issueResolutionRate: 85.3,
      });

      setRecentActivity([
        {
          id: '1',
          type: 'scan_completed',
          title: 'Scan completed for my-awesome-website',
          description: '15 issues found, 3 critical',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          status: 'warning',
          repository: 'demo-user/my-awesome-website',
          metadata: { issues: 15, critical: 3 },
        },
        {
          id: '2',
          type: 'pr_created',
          title: 'Pull request created',
          description: 'Fix accessibility issues #42',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          status: 'success',
          repository: 'demo-user/my-awesome-website',
          metadata: { prNumber: 42, fixes: 8 },
        },
        {
          id: '3',
          type: 'issue_resolved',
          title: '5 issues resolved',
          description: 'Alt text and color contrast fixes merged',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'success',
          repository: 'demo-company/e-commerce-site',
          metadata: { resolved: 5 },
        },
        {
          id: '4',
          type: 'repo_added',
          title: 'Repository connected',
          description: 'New repository added to scanning',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          status: 'info',
          repository: 'demo-company/marketing-site',
        },
      ]);

      setRepositories([
        {
          id: '1',
          name: 'my-awesome-website',
          fullName: 'demo-user/my-awesome-website',
          lastScanAt: new Date(Date.now() - 5 * 60 * 1000),
          openIssues: 15,
          criticalIssues: 3,
          scanStatus: 'completed',
        },
        {
          id: '2',
          name: 'e-commerce-site',
          fullName: 'demo-company/e-commerce-site',
          lastScanAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          openIssues: 8,
          criticalIssues: 2,
          scanStatus: 'processing',
        },
        {
          id: '3',
          name: 'marketing-site',
          fullName: 'demo-company/marketing-site',
          lastScanAt: null,
          openIssues: 0,
          criticalIssues: 0,
          scanStatus: 'pending',
        },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'scan_completed':
        return ScanLine;
      case 'pr_created':
        return GitPullRequest;
      case 'issue_resolved':
        return CheckCircle;
      case 'repo_added':
        return FolderGit2;
      default:
        return Activity;
    }
  };

  const getActivityColor = (status: RecentActivity['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getScanStatusColor = (status: Repository['scanStatus']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-100';
      case 'processing':
        return 'text-blue-700 bg-blue-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      case 'pending':
        return 'text-gray-700 bg-gray-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your accessibility scanning and compliance status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FolderGit2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Repositories</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRepositories}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ScanLine className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalScans}</p>
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.scanSuccess}% success rate
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Issues</p>
              <p className="text-2xl font-bold text-gray-900">{stats.openIssues}</p>
              <p className="text-xs text-red-600">
                {stats.criticalIssues} critical
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GitPullRequest className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pull Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.openPRs}</p>
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.prMergeRate}% merge rate
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                <Link
                  href="/dashboard/audit-logs"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {recentActivity.map((activity) => {
                const Icon = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="px-6 py-4">
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 p-2 rounded-full ${getActivityColor(activity.status)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimestamp(activity.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {activity.description}
                        </p>
                        {activity.repository && (
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.repository}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Repository Status */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Repositories</h3>
                <Link
                  href="/dashboard/repositories"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {repositories.map((repo) => (
                <div key={repo.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {repo.name}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getScanStatusColor(repo.scanStatus)}`}>
                          {repo.scanStatus}
                        </span>
                        {repo.lastScanAt && (
                          <span className="ml-2 text-xs text-gray-500">
                            {formatTimestamp(repo.lastScanAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {repo.openIssues} issues
                      </p>
                      {repo.criticalIssues > 0 && (
                        <p className="text-xs text-red-600">
                          {repo.criticalIssues} critical
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50">
              <Link
                href="/dashboard/repositories/add"
                className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FolderGit2 className="h-4 w-4 mr-2" />
                Add Repository
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <Link
                href="/dashboard/scans/new"
                className="flex items-center w-full px-4 py-3 text-left text-sm bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Zap className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-blue-900">Start New Scan</p>
                  <p className="text-blue-700 text-xs">Scan a website for accessibility issues</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-blue-600 ml-auto" />
              </Link>

              <Link
                href="/dashboard/issues?status=open"
                className="flex items-center w-full px-4 py-3 text-left text-sm bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <p className="font-medium text-yellow-900">Review Issues</p>
                  <p className="text-yellow-700 text-xs">{stats.openIssues} open issues need attention</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-yellow-600 ml-auto" />
              </Link>

              <Link
                href="/dashboard/analytics"
                className="flex items-center w-full px-4 py-3 text-left text-sm bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <BarChart3 className="h-5 w-5 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium text-purple-900">View Analytics</p>
                  <p className="text-purple-700 text-xs">Detailed insights and trends</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-purple-600 ml-auto" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}