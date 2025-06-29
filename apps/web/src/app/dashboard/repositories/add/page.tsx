'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderGit2,
  Search,
  ExternalLink,
  Check,
  AlertCircle,
  Info,
  ArrowLeft,
  Star,
  GitBranch,
  Lock,
  Globe,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { useAnalytics } from '@/hooks/useAnalytics';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  default_branch: string;
  updated_at: string;
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export default function AddRepositoryPage() {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [addingRepos, setAddingRepos] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  const router = useRouter();
  const analytics = useAnalytics();

  useEffect(() => {
    analytics.page('/dashboard/repositories/add', 'Add Repository');
    loadRepositories();
  }, [analytics]);

  useEffect(() => {
    filterRepositories();
  }, [repositories, searchQuery, filter]);

  const loadRepositories = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock GitHub API response - replace with actual API call
      const mockRepos: GitHubRepository[] = [
        {
          id: 123456789,
          name: 'my-awesome-website',
          full_name: 'demo-user/my-awesome-website',
          description: 'A modern React website with accessibility features',
          private: false,
          html_url: 'https://github.com/demo-user/my-awesome-website',
          language: 'TypeScript',
          stargazers_count: 24,
          default_branch: 'main',
          updated_at: '2024-01-15T10:30:00Z',
          permissions: { admin: true, push: true, pull: true },
        },
        {
          id: 123456790,
          name: 'e-commerce-site',
          full_name: 'demo-company/e-commerce-site',
          description: 'Next.js e-commerce platform with comprehensive accessibility',
          private: true,
          html_url: 'https://github.com/demo-company/e-commerce-site',
          language: 'JavaScript',
          stargazers_count: 12,
          default_branch: 'main',
          updated_at: '2024-01-14T15:45:00Z',
          permissions: { admin: true, push: true, pull: true },
        },
        {
          id: 123456791,
          name: 'marketing-site',
          full_name: 'demo-company/marketing-site',
          description: 'Corporate marketing website built with accessibility-first design',
          private: false,
          html_url: 'https://github.com/demo-company/marketing-site',
          language: 'HTML',
          stargazers_count: 8,
          default_branch: 'main',
          updated_at: '2024-01-13T09:20:00Z',
          permissions: { admin: true, push: true, pull: true },
        },
        {
          id: 123456792,
          name: 'blog-platform',
          full_name: 'demo-user/blog-platform',
          description: 'Personal blog built with Gatsby and accessibility best practices',
          private: false,
          html_url: 'https://github.com/demo-user/blog-platform',
          language: 'JavaScript',
          stargazers_count: 15,
          default_branch: 'main',
          updated_at: '2024-01-12T14:10:00Z',
          permissions: { admin: false, push: false, pull: true },
        },
        {
          id: 123456793,
          name: 'component-library',
          full_name: 'demo-company/component-library',
          description: 'Accessible React component library for internal use',
          private: true,
          html_url: 'https://github.com/demo-company/component-library',
          language: 'TypeScript',
          stargazers_count: 5,
          default_branch: 'develop',
          updated_at: '2024-01-11T11:30:00Z',
          permissions: { admin: true, push: true, pull: true },
        },
      ];

      setRepositories(mockRepos);
    } catch (err) {
      setError('Failed to load repositories. Please try again.');
      console.error('Error loading repositories:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterRepositories = () => {
    let filtered = repositories;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by visibility
    if (filter !== 'all') {
      filtered = filtered.filter(repo => {
        if (filter === 'public') return !repo.private;
        if (filter === 'private') return repo.private;
        return true;
      });
    }

    // Sort by updated date (most recent first)
    filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    setFilteredRepositories(filtered);
  };

  const handleToggleRepository = (repoId: number) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepos(newSelected);
  };

  const handleAddRepository = async (repo: GitHubRepository) => {
    setAddingRepos(prev => new Set(prev).add(repo.id));

    try {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      analytics.track('repository_added', {
        repository: repo.full_name,
        private: repo.private,
        language: repo.language,
      });

      // Redirect to repository page after successful addition
      router.push(`/dashboard/repositories?added=${repo.name}`);
    } catch (err) {
      console.error('Error adding repository:', err);
      // Show error notification
    } finally {
      setAddingRepos(prev => {
        const newSet = new Set(prev);
        newSet.delete(repo.id);
        return newSet;
      });
    }
  };

  const handleAddSelected = async () => {
    const selectedRepoObjects = repositories.filter(repo => selectedRepos.has(repo.id));
    
    for (const repo of selectedRepoObjects) {
      await handleAddRepository(repo);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getLanguageColor = (language: string | null) => {
    switch (language) {
      case 'TypeScript': return 'bg-blue-500';
      case 'JavaScript': return 'bg-yellow-500';
      case 'HTML': return 'bg-orange-500';
      case 'CSS': return 'bg-purple-500';
      case 'Python': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/dashboard/repositories"
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Repository</h1>
            <p className="mt-1 text-sm text-gray-600">
              Connect your GitHub repositories to start accessibility scanning
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Repository Requirements
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>You need admin or push access to create pull requests</li>
                  <li>Repository must be accessible via GitHub API</li>
                  <li>Scanning works best with web projects (HTML, CSS, JS, TS)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
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
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'public' | 'private')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Repositories</option>
            <option value="public">Public Only</option>
            <option value="private">Private Only</option>
          </select>

          <button
            onClick={loadRepositories}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRepos.size > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedRepos.size} repositories selected
            </span>
            <button
              onClick={handleAddSelected}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Add Selected Repositories
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading repositories...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Repository List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredRepositories.map((repo) => {
            const isSelected = selectedRepos.has(repo.id);
            const isAdding = addingRepos.has(repo.id);
            const hasPermissions = repo.permissions.admin || repo.permissions.push;

            return (
              <div
                key={repo.id}
                className={`bg-white rounded-lg border transition-all ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50' : 'border-gray-200'
                } hover:shadow-md`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleRepository(repo.id)}
                        disabled={!hasPermissions}
                        className={`mt-1 w-5 h-5 border-2 rounded flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-500'
                        } ${!hasPermissions ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </button>

                      {/* Repository Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FolderGit2 className="h-5 w-5 text-gray-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {repo.name}
                          </h3>
                          {repo.private ? (
                            <Lock className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Globe className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{repo.full_name}</p>
                        
                        {repo.description && (
                          <p className="text-sm text-gray-700 mb-3">{repo.description}</p>
                        )}

                        {/* Repository Metadata */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {repo.language && (
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 ${getLanguageColor(repo.language)}`} />
                              {repo.language}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Star className="h-4 w-4 mr-1" />
                            {repo.stargazers_count}
                          </div>
                          <div className="flex items-center">
                            <GitBranch className="h-4 w-4 mr-1" />
                            {repo.default_branch}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Updated {formatDate(repo.updated_at)}
                          </div>
                        </div>

                        {/* Permission Warning */}
                        {!hasPermissions && (
                          <div className="mt-3 text-sm text-yellow-700 bg-yellow-100 px-3 py-2 rounded-md">
                            <AlertCircle className="h-4 w-4 inline mr-2" />
                            Limited permissions - cannot create pull requests
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-3">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      
                      <button
                        onClick={() => handleAddRepository(repo)}
                        disabled={isAdding || !hasPermissions}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          hasPermissions
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        } ${isAdding ? 'opacity-50' : ''}`}
                      >
                        {isAdding ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Adding...
                          </div>
                        ) : (
                          'Add Repository'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {filteredRepositories.length === 0 && !loading && (
            <div className="text-center py-12">
              <FolderGit2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No repositories found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No repositories available to add.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}