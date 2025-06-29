'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  ExternalLink,
  Settings,
  Trash2,
  GitBranch,
  Star,
  Eye,
  GitCommit,
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface Repository {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  description?: string;
  private: boolean;
  language: string;
  stars: number;
  lastScanAt: Date | null;
  lastCommitAt: Date;
  openIssues: number;
  criticalIssues: number;
  resolvedIssues: number;
  totalScans: number;
  scanStatus: 'completed' | 'processing' | 'failed' | 'pending';
  defaultBranch: string;
  isActive: boolean;
  githubUrl: string;
}

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastScan' | 'issues'>('lastScan');
  const [showActions, setShowActions] = useState<string | null>(null);

  const analytics = useAnalytics();

  useEffect(() => {
    analytics.page('/dashboard/repositories', 'Repositories');
    loadRepositories();
  }, [analytics]);

  useEffect(() => {
    filterAndSortRepositories();
  }, [repositories, searchQuery, statusFilter, sortBy]);

  const loadRepositories = async () => {
    try {
      // Mock data - replace with actual API call
      const mockData: Repository[] = [
        {
          id: '1',
          name: 'my-awesome-website',
          fullName: 'demo-user/my-awesome-website',
          owner: 'demo-user',
          description: 'A modern React website with accessibility features',
          private: false,
          language: 'TypeScript',
          stars: 24,
          lastScanAt: new Date(Date.now() - 5 * 60 * 1000),
          lastCommitAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          openIssues: 15,
          criticalIssues: 3,
          resolvedIssues: 42,
          totalScans: 23,
          scanStatus: 'completed',
          defaultBranch: 'main',
          isActive: true,
          githubUrl: 'https://github.com/demo-user/my-awesome-website',
        },
        {
          id: '2',
          name: 'e-commerce-site',
          fullName: 'demo-company/e-commerce-site',
          owner: 'demo-company',
          description: 'Next.js e-commerce platform with comprehensive accessibility',
          private: true,
          language: 'JavaScript',
          stars: 12,
          lastScanAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          lastCommitAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          openIssues: 8,
          criticalIssues: 2,
          resolvedIssues: 67,
          totalScans: 31,
          scanStatus: 'processing',
          defaultBranch: 'main',
          isActive: true,
          githubUrl: 'https://github.com/demo-company/e-commerce-site',
        },
        {
          id: '3',
          name: 'marketing-site',
          fullName: 'demo-company/marketing-site',
          owner: 'demo-company',
          description: 'Corporate marketing website built with accessibility-first design',
          private: false,
          language: 'HTML',
          stars: 8,
          lastScanAt: null,
          lastCommitAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          openIssues: 0,
          criticalIssues: 0,
          resolvedIssues: 0,
          totalScans: 0,
          scanStatus: 'pending',
          defaultBranch: 'main',
          isActive: true,
          githubUrl: 'https://github.com/demo-company/marketing-site',
        },
      ];

      setRepositories(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load repositories:', error);
      setLoading(false);
    }
  };

  const filterAndSortRepositories = () => {
    let filtered = repositories;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.owner.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(repo => repo.scanStatus === statusFilter);
    }

    // Sort repositories
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastScan':
          if (!a.lastScanAt && !b.lastScanAt) return 0;
          if (!a.lastScanAt) return 1;
          if (!b.lastScanAt) return -1;
          return b.lastScanAt.getTime() - a.lastScanAt.getTime();
        case 'issues':
          return b.openIssues - a.openIssues;
        default:
          return 0;
      }
    });

    setFilteredRepositories(filtered);
  };

  const handleStartScan = (repository: Repository) => {
    analytics.track('scan_initiated', {
      repository: repository.fullName,
      source: 'repositories_page',
    });
    // Implement scan initiation
    console.log('Starting scan for:', repository.fullName);
  };

  const formatTimestamp = (timestamp: Date | null) => {
    if (!timestamp) return 'Never';
    
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

  const getScanStatusIcon = (status: Repository['scanStatus']) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'processing':
        return Activity;
      case 'failed':
        return AlertTriangle;
      case 'pending':
        return Clock;
      default:
        return Clock;
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
            <h1 className="text-2xl font-bold text-gray-900">Repositories</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage and monitor your GitHub repositories for accessibility compliance
            </p>
          </div>
          <Link
            href="/dashboard/repositories/add"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Repository
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search repositories..."
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
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'lastScan' | 'issues')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="lastScan">Last Scan</option>
            <option value="name">Name</option>
            <option value="issues">Issues</option>
          </select>
        </div>
      </div>

      {/* Repository Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRepositories.map((repository) => {
          const StatusIcon = getScanStatusIcon(repository.scanStatus);
          
          return (
            <div key={repository.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <FolderGit2 className="h-8 w-8 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/repositories/${repository.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                        >
                          {repository.name}
                        </Link>
                        {repository.private && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{repository.fullName}</p>
                      {repository.description && (
                        <p className="text-sm text-gray-500 mt-1">{repository.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowActions(showActions === repository.id ? null : repository.id)}
                      className="p-2 rounded-md hover:bg-gray-100"
                    >
                      <MoreVertical className="h-4 w-4 text-gray-400" />
                    </button>
                    
                    {showActions === repository.id && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => handleStartScan(repository)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Start Scan
                          </button>
                          <Link
                            href={`/dashboard/repositories/${repository.id}/settings`}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Settings className="inline w-4 h-4 mr-2" />
                            Settings
                          </Link>
                          <a
                            href={repository.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <ExternalLink className="inline w-4 h-4 mr-2" />
                            View on GitHub
                          </a>
                          <button className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                            <Trash2 className="inline w-4 h-4 mr-2" />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Repository Stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      repository.language === 'TypeScript' ? 'bg-blue-500' :
                      repository.language === 'JavaScript' ? 'bg-yellow-500' :
                      repository.language === 'HTML' ? 'bg-orange-500' : 'bg-gray-500'
                    }`} />
                    {repository.language}
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 mr-1" />
                    {repository.stars}
                  </div>
                  <div className="flex items-center">
                    <GitBranch className="h-4 w-4 mr-1" />
                    {repository.defaultBranch}
                  </div>
                  <div className="flex items-center">
                    <GitCommit className="h-4 w-4 mr-1" />
                    {formatTimestamp(repository.lastCommitAt)}
                  </div>
                </div>

                {/* Scan Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <StatusIcon className="h-4 w-4 mr-2 text-gray-600" />
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getScanStatusColor(repository.scanStatus)}`}>
                      {repository.scanStatus.charAt(0).toUpperCase() + repository.scanStatus.slice(1)}
                    </span>
                    {repository.lastScanAt && (
                      <span className="ml-2 text-sm text-gray-500">
                        {formatTimestamp(repository.lastScanAt)}
                      </span>
                    )}
                  </div>
                  
                  {repository.scanStatus !== 'processing' && (
                    <button
                      onClick={() => handleStartScan(repository)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Start Scan
                    </button>
                  )}
                </div>

                {/* Issues Summary */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{repository.openIssues}</p>
                    <p className="text-xs text-gray-500">Open Issues</p>
                    {repository.criticalIssues > 0 && (
                      <p className="text-xs text-red-600">{repository.criticalIssues} critical</p>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-600">{repository.resolvedIssues}</p>
                    <p className="text-xs text-gray-500">Resolved</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-blue-600">{repository.totalScans}</p>
                    <p className="text-xs text-gray-500">Total Scans</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/repositories/${repository.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View Details
                  </Link>
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/repositories/${repository.id}/scans`}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      Scans
                    </Link>
                    <Link
                      href={`/dashboard/repositories/${repository.id}/issues`}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      Issues
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRepositories.length === 0 && (
        <div className="text-center py-12">
          <FolderGit2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchQuery || statusFilter !== 'all' ? 'No repositories match your filters' : 'No repositories'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first repository.'
            }
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <div className="mt-6">
              <Link
                href="/dashboard/repositories/add"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Repository
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}