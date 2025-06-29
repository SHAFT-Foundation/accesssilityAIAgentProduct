'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GitPullRequest,
  ExternalLink,
  MoreVertical,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  GitMerge,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  MessageSquare,
  GitCommit,
  FolderGit2,
  User,
  Tag,
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface PullRequest {
  id: string;
  githubPrNumber: number;
  title: string;
  description: string;
  branch: string;
  status: 'open' | 'merged' | 'closed';
  repository: {
    id: string;
    name: string;
    fullName: string;
    owner: string;
  };
  issues: Array<{
    id: string;
    type: string;
    severity: 'blocker' | 'critical' | 'major' | 'minor';
    status: 'open' | 'in_progress' | 'resolved' | 'ignored';
    title: string;
    wcagCriteria: string;
  }>;
  createdAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
  githubUrl: string;
  stats: {
    totalIssues: number;
    criticalIssues: number;
    majorIssues: number;
    minorIssues: number;
    blockerIssues: number;
    resolvedIssues: number;
    additions: number;
    deletions: number;
    changedFiles: number;
    commits: number;
  };
  author: {
    login: string;
    avatarUrl: string;
  };
  reviewers?: Array<{
    login: string;
    avatarUrl: string;
    state: 'approved' | 'changes_requested' | 'commented';
  }>;
}

export default function PullRequestsPage() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [filteredPRs, setFilteredPRs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [repositoryFilter, setRepositoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'issues'>('created');
  const [showActions, setShowActions] = useState<string | null>(null);

  const analytics = useAnalytics();

  useEffect(() => {
    analytics.page('/dashboard/pull-requests', 'Pull Requests');
    loadPullRequests();
  }, [analytics]);

  useEffect(() => {
    filterAndSortPRs();
  }, [pullRequests, searchQuery, statusFilter, repositoryFilter, sortBy]);

  const loadPullRequests = async () => {
    try {
      // Mock data - replace with actual API call
      const mockPRs: PullRequest[] = [
        {
          id: '1',
          githubPrNumber: 42,
          title: 'Fix accessibility issues: Add alt text and improve contrast',
          description: 'This PR addresses several accessibility issues found during automated scanning:\n\n- Added alt text to hero image\n- Improved color contrast for secondary buttons\n- Fixed heading hierarchy on about page\n- Added proper labels to contact form\n- Enhanced focus indicators',
          branch: 'fix/accessibility-improvements',
          status: 'open',
          repository: {
            id: 'repo1',
            name: 'my-awesome-website',
            fullName: 'demo-user/my-awesome-website',
            owner: 'demo-user',
          },
          issues: [
            {
              id: 'issue1',
              type: 'missing_alt_text',
              severity: 'critical',
              status: 'resolved',
              title: 'Image missing alt text',
              wcagCriteria: '1.1.1',
            },
            {
              id: 'issue2',
              type: 'color_contrast',
              severity: 'major',
              status: 'resolved',
              title: 'Insufficient color contrast',
              wcagCriteria: '1.4.3',
            },
            {
              id: 'issue3',
              type: 'heading_structure',
              severity: 'major',
              status: 'resolved',
              title: 'Heading levels skip from H1 to H3',
              wcagCriteria: '1.3.1',
            },
          ],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          mergedAt: null,
          closedAt: null,
          githubUrl: 'https://github.com/demo-user/my-awesome-website/pull/42',
          stats: {
            totalIssues: 3,
            criticalIssues: 1,
            majorIssues: 2,
            minorIssues: 0,
            blockerIssues: 0,
            resolvedIssues: 3,
            additions: 127,
            deletions: 43,
            changedFiles: 8,
            commits: 5,
          },
          author: {
            login: 'ai-accessibility-bot',
            avatarUrl: 'https://github.com/ai-accessibility-bot.png',
          },
          reviewers: [
            {
              login: 'demo-user',
              avatarUrl: 'https://github.com/demo-user.png',
              state: 'approved',
            },
          ],
        },
        {
          id: '2',
          githubPrNumber: 38,
          title: 'Implement ARIA labels for navigation menu',
          description: 'Added comprehensive ARIA labels to improve screen reader navigation',
          branch: 'feature/aria-navigation',
          status: 'merged',
          repository: {
            id: 'repo2',
            name: 'e-commerce-site',
            fullName: 'demo-company/e-commerce-site',
            owner: 'demo-company',
          },
          issues: [
            {
              id: 'issue4',
              type: 'missing_aria_label',
              severity: 'major',
              status: 'resolved',
              title: 'Navigation missing ARIA labels',
              wcagCriteria: '4.1.2',
            },
          ],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          mergedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          closedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          githubUrl: 'https://github.com/demo-company/e-commerce-site/pull/38',
          stats: {
            totalIssues: 1,
            criticalIssues: 0,
            majorIssues: 1,
            minorIssues: 0,
            blockerIssues: 0,
            resolvedIssues: 1,
            additions: 65,
            deletions: 12,
            changedFiles: 3,
            commits: 2,
          },
          author: {
            login: 'ai-accessibility-bot',
            avatarUrl: 'https://github.com/ai-accessibility-bot.png',
          },
        },
        {
          id: '3',
          githubPrNumber: 15,
          title: 'Fix form validation and keyboard navigation',
          description: 'Comprehensive form accessibility improvements',
          branch: 'fix/form-accessibility',
          status: 'closed',
          repository: {
            id: 'repo3',
            name: 'marketing-site',
            fullName: 'demo-company/marketing-site',
            owner: 'demo-company',
          },
          issues: [
            {
              id: 'issue5',
              type: 'form_validation',
              severity: 'critical',
              status: 'ignored',
              title: 'Form validation not accessible',
              wcagCriteria: '3.3.1',
            },
          ],
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          mergedAt: null,
          closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          githubUrl: 'https://github.com/demo-company/marketing-site/pull/15',
          stats: {
            totalIssues: 1,
            criticalIssues: 1,
            majorIssues: 0,
            minorIssues: 0,
            blockerIssues: 0,
            resolvedIssues: 0,
            additions: 89,
            deletions: 23,
            changedFiles: 5,
            commits: 3,
          },
          author: {
            login: 'ai-accessibility-bot',
            avatarUrl: 'https://github.com/ai-accessibility-bot.png',
          },
        },
      ];

      setPullRequests(mockPRs);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load pull requests:', error);
      setLoading(false);
    }
  };

  const filterAndSortPRs = () => {
    let filtered = pullRequests;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(pr =>
        pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.repository.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pr.branch.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pr => pr.status === statusFilter);
    }

    // Filter by repository
    if (repositoryFilter !== 'all') {
      filtered = filtered.filter(pr => pr.repository.id === repositoryFilter);
    }

    // Sort pull requests
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'updated':
          const aUpdated = a.mergedAt || a.closedAt || a.createdAt;
          const bUpdated = b.mergedAt || b.closedAt || b.createdAt;
          return bUpdated.getTime() - aUpdated.getTime();
        case 'issues':
          return b.stats.totalIssues - a.stats.totalIssues;
        default:
          return 0;
      }
    });

    setFilteredPRs(filtered);
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

  const getPRStatusIcon = (status: PullRequest['status']) => {
    switch (status) {
      case 'open':
        return GitPullRequest;
      case 'merged':
        return GitMerge;
      case 'closed':
        return XCircle;
      default:
        return GitPullRequest;
    }
  };

  const getPRStatusColor = (status: PullRequest['status']) => {
    switch (status) {
      case 'open':
        return 'text-green-700 bg-green-100';
      case 'merged':
        return 'text-purple-700 bg-purple-100';
      case 'closed':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'blocker':
        return 'text-red-900 bg-red-100';
      case 'critical':
        return 'text-red-700 bg-red-100';
      case 'major':
        return 'text-yellow-700 bg-yellow-100';
      case 'minor':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const uniqueRepositories = Array.from(
    new Set(pullRequests.map(pr => pr.repository.id))
  ).map(id => pullRequests.find(pr => pr.repository.id === id)?.repository).filter(Boolean);

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
            <h1 className="text-2xl font-bold text-gray-900">Pull Requests</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor and review accessibility fix pull requests
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GitPullRequest className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open</p>
              <p className="text-2xl font-bold text-gray-900">
                {pullRequests.filter(pr => pr.status === 'open').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <GitMerge className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Merged</p>
              <p className="text-2xl font-bold text-gray-900">
                {pullRequests.filter(pr => pr.status === 'merged').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Closed</p>
              <p className="text-2xl font-bold text-gray-900">
                {pullRequests.filter(pr => pr.status === 'closed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Issues Fixed</p>
              <p className="text-2xl font-bold text-gray-900">
                {pullRequests.reduce((sum, pr) => sum + pr.stats.resolvedIssues, 0)}
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
              placeholder="Search pull requests..."
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
            <option value="open">Open</option>
            <option value="merged">Merged</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={repositoryFilter}
            onChange={(e) => setRepositoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Repositories</option>
            {uniqueRepositories.map((repo) => (
              <option key={repo!.id} value={repo!.id}>
                {repo!.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'created' | 'updated' | 'issues')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="created">Created Date</option>
            <option value="updated">Last Updated</option>
            <option value="issues">Issues Fixed</option>
          </select>
        </div>
      </div>

      {/* Pull Requests List */}
      <div className="space-y-6">
        {filteredPRs.map((pr) => {
          const StatusIcon = getPRStatusIcon(pr.status);
          
          return (
            <div key={pr.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 pt-1">
                      <StatusIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Link
                          href={`/dashboard/pull-requests/${pr.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                        >
                          {pr.title}
                        </Link>
                        <span className="text-gray-500">#{pr.githubPrNumber}</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPRStatusColor(pr.status)}`}>
                          {pr.status.charAt(0).toUpperCase() + pr.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <FolderGit2 className="h-4 w-4 mr-1" />
                        <span className="mr-4">{pr.repository.fullName}</span>
                        <Tag className="h-4 w-4 mr-1" />
                        <span className="mr-4">{pr.branch}</span>
                        <User className="h-4 w-4 mr-1" />
                        <span>{pr.author.login}</span>
                      </div>

                      <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                        {pr.description}
                      </p>

                      {/* Issues Summary */}
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-gray-600">{pr.stats.totalIssues} issues</span>
                          {pr.stats.criticalIssues > 0 && (
                            <span className="ml-1 text-red-600">({pr.stats.criticalIssues} critical)</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                          <span className="text-green-600">{pr.stats.resolvedIssues} resolved</span>
                        </div>
                        <div className="flex items-center">
                          <GitCommit className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-gray-600">{pr.stats.commits} commits</span>
                        </div>
                        <div className="text-gray-600">
                          +{pr.stats.additions} -{pr.stats.deletions}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <a
                      href={pr.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowActions(showActions === pr.id ? null : pr.id)}
                        className="p-2 rounded-md hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                      
                      {showActions === pr.id && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1">
                            <Link
                              href={`/dashboard/pull-requests/${pr.id}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Eye className="inline w-4 h-4 mr-2" />
                              View Details
                            </Link>
                            <Link
                              href={`/dashboard/pull-requests/${pr.id}/issues`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <AlertTriangle className="inline w-4 h-4 mr-2" />
                              View Issues
                            </Link>
                            <a
                              href={pr.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <ExternalLink className="inline w-4 h-4 mr-2" />
                              Open in GitHub
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Issues List */}
                {pr.issues.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Issues Addressed</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {pr.issues.map((issue) => (
                        <div key={issue.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </span>
                              <span className="text-xs text-gray-500">WCAG {issue.wcagCriteria}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mt-1">{issue.title}</p>
                          </div>
                          <div className="flex-shrink-0">
                            {issue.status === 'resolved' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created {formatTimestamp(pr.createdAt)}
                    </div>
                    {pr.mergedAt && (
                      <div className="flex items-center">
                        <GitMerge className="h-4 w-4 mr-1" />
                        Merged {formatTimestamp(pr.mergedAt)}
                      </div>
                    )}
                    {pr.closedAt && !pr.mergedAt && (
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 mr-1" />
                        Closed {formatTimestamp(pr.closedAt)}
                      </div>
                    )}
                  </div>

                  {/* Reviewers */}
                  {pr.reviewers && pr.reviewers.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {pr.reviewers.map((reviewer, index) => (
                        <div key={reviewer.login} className="relative">
                          <img
                            src={reviewer.avatarUrl}
                            alt={reviewer.login}
                            className="w-6 h-6 rounded-full border-2 border-white"
                            title={`${reviewer.login} - ${reviewer.state}`}
                          />
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${
                            reviewer.state === 'approved' ? 'bg-green-500' :
                            reviewer.state === 'changes_requested' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredPRs.length === 0 && (
          <div className="text-center py-12">
            <GitPullRequest className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchQuery || statusFilter !== 'all' || repositoryFilter !== 'all' 
                ? 'No pull requests match your filters' 
                : 'No pull requests yet'
              }
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all' || repositoryFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Pull requests will appear here when accessibility fixes are generated.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}