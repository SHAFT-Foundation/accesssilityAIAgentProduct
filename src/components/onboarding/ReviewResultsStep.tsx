'use client';

import { useState } from 'react';
import { CheckCircle, GitPullRequest, Eye, AlertTriangle, Info, Code, Play } from 'lucide-react';

interface ReviewResultsStepProps {
  onComplete: () => void;
  userData: any;
  startProductTour: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

interface AccessibilityIssue {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  element: string;
  wcagCriteria: string;
  fixDescription: string;
  codeExample: string;
}

export function ReviewResultsStep({
  onComplete,
  userData,
  startProductTour,
  isLoading,
  setIsLoading
}: ReviewResultsStepProps) {
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);
  const [prCreated, setPrCreated] = useState(false);

  // Mock accessibility issues
  const issues: AccessibilityIssue[] = [
    {
      id: '1',
      type: 'alt-text',
      severity: 'critical',
      title: 'Missing alt text for images',
      description: 'Images must have alternative text for screen readers',
      element: '<img src="hero.jpg">',
      wcagCriteria: '1.1.1',
      fixDescription: 'Add descriptive alt attribute to image',
      codeExample: '<img src="hero.jpg" alt="Team collaboration in modern office space">',
    },
    {
      id: '2',
      type: 'contrast',
      severity: 'critical',
      title: 'Low color contrast ratio',
      description: 'Text color does not meet minimum contrast requirements',
      element: '.button-secondary',
      wcagCriteria: '1.4.3',
      fixDescription: 'Increase color contrast to meet AA standards',
      codeExample: 'color: #1a365d; /* Changed from #64748b for better contrast */',
    },
    {
      id: '3',
      type: 'heading',
      severity: 'warning',
      title: 'Heading hierarchy issue',
      description: 'Heading levels should not skip (h1 to h3)',
      element: '<h3>Section Title</h3>',
      wcagCriteria: '1.3.1',
      fixDescription: 'Change h3 to h2 to maintain proper hierarchy',
      codeExample: '<h2>Section Title</h2>',
    },
    {
      id: '4',
      type: 'form-label',
      severity: 'critical',
      title: 'Missing form label',
      description: 'Form inputs must have associated labels',
      element: '<input type="email" placeholder="Email">',
      wcagCriteria: '3.3.2',
      fixDescription: 'Add label element for form input',
      codeExample: '<label for="email">Email Address</label>\n<input type="email" id="email" placeholder="Email">',
    },
  ];

  const handleCreatePR = async () => {
    setIsLoading(true);
    
    // Simulate PR creation
    setTimeout(() => {
      setPrCreated(true);
      setIsLoading(false);
    }, 2000);
  };

  const handleFinishOnboarding = () => {
    onComplete();
    startProductTour();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-orange-600 bg-orange-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return AlertTriangle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-6">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Review Your Accessibility Report
        </h2>
        
        <p className="text-lg text-gray-600">
          We found {issues.length} issues that can be automatically fixed with AI-generated code.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {issues.length}
          </div>
          <div className="text-sm text-gray-600">Total Issues</div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-red-600 mb-2">
            {issues.filter(i => i.severity === 'critical').length}
          </div>
          <div className="text-sm text-gray-600">Critical</div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-orange-600 mb-2">
            {issues.filter(i => i.severity === 'warning').length}
          </div>
          <div className="text-sm text-gray-600">Warnings</div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">
            100%
          </div>
          <div className="text-sm text-gray-600">Auto-Fixable</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Issues List */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Accessibility Issues Found
          </h3>
          
          <div className="space-y-3">
            {issues.map((issue) => {
              const SeverityIcon = getSeverityIcon(issue.severity);
              return (
                <div
                  key={issue.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedIssue?.id === issue.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedIssue(issue)}
                >
                  <div className="flex items-start">
                    <div className={`w-8 h-8 rounded-full ${getSeverityColor(issue.severity)} flex items-center justify-center mr-3 flex-shrink-0`}>
                      <SeverityIcon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {issue.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {issue.description}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="mr-4">WCAG {issue.wcagCriteria}</span>
                        <span className={`px-2 py-1 rounded-full ${getSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Issue Details */}
        <div>
          {selectedIssue ? (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Issue Details & AI-Generated Fix
              </h3>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {selectedIssue.title}
                  </h4>
                  <p className="text-gray-600 mb-4">
                    {selectedIssue.description}
                  </p>
                  
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">Current Code:</span>
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded font-mono text-sm">
                      {selectedIssue.element}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h5 className="font-semibold text-gray-900 mb-2">
                    AI-Generated Fix
                  </h5>
                  <p className="text-gray-600 mb-3">
                    {selectedIssue.fixDescription}
                  </p>
                  
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">Fixed Code:</span>
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded font-mono text-sm">
                      {selectedIssue.codeExample}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">
                      Fix verified and ready for PR
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select an Issue
              </h3>
              <p className="text-gray-600">
                Click on an issue from the list to see details and the AI-generated fix.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create PR Section */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        {!prCreated ? (
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Ready to Create Your First Pull Request?
            </h3>
            <p className="text-gray-600 mb-6">
              We'll create a PR with all {issues.length} fixes for your review and approval.
            </p>
            
            <button
              onClick={handleCreatePR}
              disabled={isLoading}
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Creating Pull Request...
                </>
              ) : (
                <>
                  <GitPullRequest className="mr-3 w-5 h-5" />
                  Create Pull Request with Fixes
                </>
              )}
            </button>
            
            <p className="mt-4 text-sm text-gray-500">
              The PR will be created in your repository for review
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-900 mb-2">
                Pull Request Created Successfully!
              </h3>
              <p className="text-green-800 mb-4">
                PR #247: "Fix accessibility issues - Auto-generated by AI Accessibility Scanner"
              </p>
              
              <div className="flex items-center justify-center space-x-4">
                <a
                  href="#"
                  className="inline-flex items-center px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50 transition-colors"
                >
                  <GitPullRequest className="mr-2 w-4 h-4" />
                  View PR on GitHub
                </a>
                
                <a
                  href="#"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                >
                  <Code className="mr-2 w-4 h-4" />
                  Review Changes
                </a>
              </div>
            </div>

            <button
              onClick={handleFinishOnboarding}
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Play className="mr-3 w-5 h-5" />
              Take Product Tour & Go to Dashboard
            </button>
            
            <p className="mt-4 text-sm text-gray-500">
              Learn about advanced features and start monitoring your accessibility
            </p>
          </div>
        )}
      </div>
    </div>
  );
}