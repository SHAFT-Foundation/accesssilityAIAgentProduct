'use client';

import { useState } from 'react';
import { Github, ChevronRight, Lock, Eye, GitBranch, CheckCircle, AlertCircle } from 'lucide-react';

interface ConnectRepositoryStepProps {
  onNext: () => void;
  onComplete: () => void;
  userData: any;
  updateUserData: (updates: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

interface Repository {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  url: string;
  language: string;
  updatedAt: string;
}

export function ConnectRepositoryStep({ 
  onNext, 
  onComplete, 
  userData, 
  updateUserData, 
  isLoading, 
  setIsLoading 
}: ConnectRepositoryStepProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  // Mock repositories for demo
  const mockRepositories: Repository[] = [
    {
      id: '1',
      name: 'my-website',
      fullName: 'user/my-website',
      private: false,
      url: 'https://github.com/user/my-website',
      language: 'TypeScript',
      updatedAt: '2 days ago',
    },
    {
      id: '2',
      name: 'company-portal',
      fullName: 'company/company-portal',
      private: true,
      url: 'https://github.com/company/company-portal',
      language: 'React',
      updatedAt: '1 week ago',
    },
    {
      id: '3',
      name: 'docs-site',
      fullName: 'user/docs-site',
      private: false,
      url: 'https://github.com/user/docs-site',
      language: 'Next.js',
      updatedAt: '3 days ago',
    },
  ];

  const handleGitHubConnect = async () => {
    setIsLoading(true);
    
    // Simulate OAuth flow
    setTimeout(() => {
      setIsConnected(true);
      setRepositories(mockRepositories);
      setIsLoading(false);
    }, 2000);
  };

  const handleRepositorySelect = (repo: Repository) => {
    setSelectedRepo(repo);
    updateUserData({
      connectedRepo: {
        name: repo.name,
        url: repo.url,
        fullName: repo.fullName,
      },
    });
  };

  const handleContinue = () => {
    if (selectedRepo) {
      onComplete();
      onNext();
    }
  };

  const permissions = [
    {
      name: 'Repository Access',
      description: 'Read repository metadata and source code for scanning',
      icon: GitBranch,
      required: true,
    },
    {
      name: 'Pull Request Creation',
      description: 'Create pull requests with accessibility fixes',
      icon: CheckCircle,
      required: true,
    },
    {
      name: 'Email Address',
      description: 'Access your email for account management',
      icon: Eye,
      required: true,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-full mb-6">
          <Github className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Connect Your GitHub Repository
        </h2>
        
        <p className="text-lg text-gray-600">
          We need access to your repository to scan for accessibility issues and create pull requests with fixes.
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <Lock className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Your Code is Secure
            </h3>
            <ul className="text-green-800 space-y-1">
              <li>• Source code is processed in ephemeral containers</li>
              <li>• No permanent storage of your code</li>
              <li>• Containers are destroyed after each PR</li>
              <li>• SOC 2 Type II certified security</li>
            </ul>
          </div>
        </div>
      </div>

      {!isConnected ? (
        <>
          {/* Permissions Preview */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Required Permissions
            </h3>
            
            <div className="space-y-4">
              {permissions.map((permission) => (
                <div
                  key={permission.name}
                  className="flex items-start p-4 border border-gray-200 rounded-lg"
                >
                  <permission.icon className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {permission.name}
                      {permission.required && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                          Required
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {permission.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connect Button */}
          <div className="text-center">
            <button
              onClick={handleGitHubConnect}
              disabled={isLoading}
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Connecting to GitHub...
                </>
              ) : (
                <>
                  <Github className="mr-3 w-5 h-5" />
                  Connect with GitHub
                </>
              )}
            </button>
            
            <p className="mt-4 text-sm text-gray-500">
              You'll be redirected to GitHub to authorize the connection
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  Successfully Connected to GitHub
                </h3>
                <p className="text-green-800">
                  Your account has been linked. Now select a repository to scan.
                </p>
              </div>
            </div>
          </div>

          {/* Repository Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Select Repository to Scan
            </h3>
            
            <div className="space-y-3">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRepo?.id === repo.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRepositorySelect(repo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-4">
                        <h4 className="font-medium text-gray-900">
                          {repo.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {repo.fullName}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          {repo.private ? (
                            <Lock className="w-4 h-4 mr-1" />
                          ) : (
                            <Eye className="w-4 h-4 mr-1" />
                          )}
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                        
                        <span>{repo.language}</span>
                        <span>Updated {repo.updatedAt}</span>
                      </div>
                    </div>
                    
                    <div className={`w-6 h-6 rounded-full border-2 ${
                      selectedRepo?.id === repo.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedRepo?.id === repo.id && (
                        <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {repositories.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No repositories found
                </h3>
                <p className="text-gray-600">
                  Make sure you have repositories in your GitHub account that you can access.
                </p>
              </div>
            )}
          </div>

          {/* Continue Button */}
          {selectedRepo && (
            <div className="text-center">
              <button
                onClick={handleContinue}
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Continue with {selectedRepo.name}
                <ChevronRight className="ml-2 w-5 h-5" />
              </button>
              
              <p className="mt-4 text-sm text-gray-500">
                We'll scan this repository for accessibility issues
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}