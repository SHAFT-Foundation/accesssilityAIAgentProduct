'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ScanLine,
  Play,
  Pause,
  RotateCcw,
  MoreVertical,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  FolderGit2,
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface Scan {
  id: string;
  url: string;
  repository?: {
    id: string;
    name: string;
    fullName: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalIssues: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  blockerIssues: number;
  resolvedIssues: number;
  startedAt: Date | null;
  completedAt: Date | null;
  duration: number | null; // in milliseconds
  errorMessage?: string;
  createdAt: Date;
  metadata?: {
    browser?: string;
    viewport?: { width: number; height: number };
    userAgent?: string;
  };
}

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [filteredScans, setFilteredScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'duration' | 'issues'>('createdAt');
  const [showActions, setShowActions] = useState<string | null>(null);

  const analytics = useAnalytics();

  useEffect(() => {
    analytics.page('/dashboard/scans', 'Scans');
    loadScans();
  }, [analytics]);

  useEffect(() => {
    filterAndSortScans();
  }, [scans, searchQuery, statusFilter, sortBy]);

  const loadScans = async () => {
    try {
      // Mock data - replace with actual API call
      const mockScans: Scan[] = [
        {
          id: '1',
          url: 'https://demo-user.github.io/my-awesome-website',
          repository: {
            id: 'repo1',
            name: 'my-awesome-website',
            fullName: 'demo-user/my-awesome-website',
          },
          status: 'completed',
          totalIssues: 15,
          criticalIssues: 3,
          majorIssues: 8,
          minorIssues: 4,
          blockerIssues: 0,
          resolvedIssues: 0,
          startedAt: new Date(Date.now() - 10 * 60 * 1000),
          completedAt: new Date(Date.now() - 5 * 60 * 1000),
          duration: 5 * 60 * 1000,
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
          metadata: {
            browser: 'chromium',
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (compatible; AccessibilityScanner/1.0)',
          },
        },
        {
          id: '2',
          url: 'https://demo-company.github.io/e-commerce-site',
          repository: {
            id: 'repo2',
            name: 'e-commerce-site',
            fullName: 'demo-company/e-commerce-site',
          },
          status: 'processing',
          totalIssues: 0,
          criticalIssues: 0,
          majorIssues: 0,
          minorIssues: 0,
          blockerIssues: 0,
          resolvedIssues: 0,
          startedAt: new Date(Date.now() - 2 * 60 * 1000),
          completedAt: null,
          duration: null,
          createdAt: new Date(Date.now() - 2 * 60 * 1000),
          metadata: {
            browser: 'chromium',
            viewport: { width: 1920, height: 1080 },
          },
        },
        {
          id: '3',
          url: 'https://demo-company.github.io/marketing-site',
          repository: {
            id: 'repo3',
            name: 'marketing-site',
            fullName: 'demo-company/marketing-site',
          },
          status: 'failed',
          totalIssues: 0,
          criticalIssues: 0,
          majorIssues: 0,
          minorIssues: 0,
          blockerIssues: 0,
          resolvedIssues: 0,
          startedAt: new Date(Date.now() - 30 * 60 * 1000),
          completedAt: new Date(Date.now() - 25 * 60 * 1000),
          duration: 5 * 60 * 1000,
          errorMessage: 'Website returned 404 error',
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          id: '4',
          url: 'https://demo-user.github.io/blog-platform',
          status: 'pending',
          totalIssues: 0,
          criticalIssues: 0,
          majorIssues: 0,
          minorIssues: 0,
          blockerIssues: 0,
          resolvedIssues: 0,
          startedAt: null,
          completedAt: null,
          duration: null,
          createdAt: new Date(Date.now() - 1 * 60 * 1000),
        },
      ];

      setScans(mockScans);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load scans:', error);
      setLoading(false);
    }
  };

  const filterAndSortScans = () => {
    let filtered = scans;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(scan =>
        scan.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.repository?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.repository?.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(scan => scan.status === statusFilter);
    }

    // Sort scans
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'createdAt':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'duration':
          if (a.duration === null && b.duration === null) return 0;
          if (a.duration === null) return 1;
          if (b.duration === null) return -1;
          return b.duration - a.duration;
        case 'issues':
          return b.totalIssues - a.totalIssues;
        default:
          return 0;
      }
    });

    setFilteredScans(filtered);
  };

  const handleCancelScan = (scanId: string) => {
    analytics.track('scan_cancelled', { scanId });
    // Implement scan cancellation
    console.log('Cancelling scan:', scanId);
  };

  const handleRetryScan = (scanId: string) => {
    analytics.track('scan_retried', { scanId });
    // Implement scan retry
    console.log('Retrying scan:', scanId);
  };

  const handleDeleteScan = (scanId: string) => {
    analytics.track('scan_deleted', { scanId });
    // Implement scan deletion
    console.log('Deleting scan:', scanId);
  };

  const formatTimestamp = (timestamp: Date | null) => {
    if (!timestamp) return 'N/A';
    
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

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'N/A';
    
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getScanStatusIcon = (status: Scan['status']) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Activity;
      case 'failed':
        return XCircle;
      case 'cancelled':
        return XCircle;
      case 'pending':
        return Clock;
      default:
        return Clock;
    }
  };

  const getScanStatusColor = (status: Scan['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-100';
      case 'processing':
        return 'text-blue-700 bg-blue-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      case 'cancelled':
        return 'text-gray-700 bg-gray-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scans</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor and manage your accessibility scans
            </p>
          </div>
          <Link
            href="/dashboard/scans/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Start New Scan
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ScanLine className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-2xl font-bold text-gray-900">{scans.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {scans.filter(s => s.status === 'processing').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {scans.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">
                {scans.filter(s => s.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search scans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'duration' | 'issues')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="createdAt">Created Date</option>
            <option value="duration">Duration</option>
            <option value="issues">Issues Found</option>
          </select>
        </div>
      </div>

      {/* Scans Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL / Repository
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issues Found
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredScans.map((scan) => {
                const StatusIcon = getScanStatusIcon(scan.status);
                
                return (
                  <tr key={scan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {scan.url}
                        </div>
                        {scan.repository && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <FolderGit2 className="h-4 w-4 mr-1" />
                            {scan.repository.fullName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <StatusIcon className="h-4 w-4 mr-2 text-gray-600" />
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getScanStatusColor(scan.status)}`}>
                          {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                        </span>
                      </div>
                      {scan.errorMessage && (
                        <div className="text-xs text-red-600 mt-1" title={scan.errorMessage}>
                          {scan.errorMessage.length > 30 
                            ? `${scan.errorMessage.substring(0, 30)}...`
                            : scan.errorMessage
                          }
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {scan.totalIssues > 0 ? scan.totalIssues : '—'}
                      </div>
                      {scan.totalIssues > 0 && (
                        <div className="text-xs text-gray-500">
                          {scan.criticalIssues > 0 && (
                            <span className="text-red-600">{scan.criticalIssues} critical</span>
                          )}
                          {scan.criticalIssues > 0 && scan.majorIssues > 0 && ', '}
                          {scan.majorIssues > 0 && (
                            <span className="text-yellow-600">{scan.majorIssues} major</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(scan.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(scan.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === scan.id ? null : scan.id)}
                          className="p-2 rounded-md hover:bg-gray-100"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                        
                        {showActions === scan.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <Link
                                href={`/dashboard/scans/${scan.id}`}
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <Eye className="inline w-4 h-4 mr-2" />
                                View Details
                              </Link>
                              
                              {scan.status === 'completed' && (
                                <Link
                                  href={`/dashboard/scans/${scan.id}/issues`}
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <AlertTriangle className="inline w-4 h-4 mr-2" />
                                  View Issues
                                </Link>
                              )}
                              
                              {scan.status === 'processing' && (
                                <button
                                  onClick={() => handleCancelScan(scan.id)}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Pause className="inline w-4 h-4 mr-2" />
                                  Cancel Scan
                                </button>
                              )}
                              
                              {scan.status === 'failed' && (
                                <button
                                  onClick={() => handleRetryScan(scan.id)}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <RotateCcw className="inline w-4 h-4 mr-2" />
                                  Retry Scan
                                </button>
                              )}
                              
                              {scan.status === 'completed' && (
                                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                  <Download className="inline w-4 h-4 mr-2" />
                                  Export Report
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleDeleteScan(scan.id)}
                                className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="inline w-4 h-4 mr-2" />
                                Delete Scan
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredScans.length === 0 && (
          <div className="text-center py-12">
            <ScanLine className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchQuery || statusFilter !== 'all' ? 'No scans match your filters' : 'No scans yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by running your first accessibility scan.'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <div className="mt-6">
                <Link
                  href="/dashboard/scans/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start New Scan
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}