'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Globe, Search, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';

interface FirstScanStepProps {
  onNext: () => void;
  onComplete: () => void;
  userData: any;
  updateUserData: (updates: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

interface ScanProgress {
  stage: 'setup' | 'crawling' | 'analyzing' | 'generating' | 'completed';
  percentage: number;
  message: string;
  estimatedTime?: string;
}

export function FirstScanStep({
  onNext,
  onComplete,
  userData,
  updateUserData,
  isLoading,
  setIsLoading
}: FirstScanStepProps) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scanStarted, setScanStarted] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    stage: 'setup',
    percentage: 0,
    message: 'Preparing to scan...',
  });

  const handleStartScan = async () => {
    if (!websiteUrl) return;
    
    setScanStarted(true);
    setIsLoading(true);
    
    // Simulate scan progress
    const stages: ScanProgress[] = [
      {
        stage: 'setup',
        percentage: 10,
        message: 'Setting up secure scanning environment...',
        estimatedTime: '30 seconds',
      },
      {
        stage: 'crawling',
        percentage: 30,
        message: 'Crawling website pages and analyzing structure...',
        estimatedTime: '2 minutes',
      },
      {
        stage: 'analyzing',
        percentage: 60,
        message: 'AI analyzing accessibility issues and WCAG violations...',
        estimatedTime: '1 minute',
      },
      {
        stage: 'generating',
        percentage: 85,
        message: 'Generating code fixes and preparing PR...',
        estimatedTime: '30 seconds',
      },
      {
        stage: 'completed',
        percentage: 100,
        message: 'Scan completed successfully!',
      },
    ];

    for (let i = 0; i < stages.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setScanProgress(stages[i]);
    }

    // Update user data with scan results
    updateUserData({
      firstScan: {
        id: 'scan_' + Date.now(),
        status: 'completed',
        issuesFound: 12,
        url: websiteUrl,
      },
    });

    setIsLoading(false);
  };

  const handleContinue = () => {
    onComplete();
    onNext();
  };

  const getScanStageIcon = (stage: ScanProgress['stage']) => {
    switch (stage) {
      case 'setup':
        return Clock;
      case 'crawling':
        return Search;
      case 'analyzing':
        return Zap;
      case 'generating':
        return CheckCircle;
      case 'completed':
        return CheckCircle;
      default:
        return Clock;
    }
  };

  const getScanStageColor = (stage: ScanProgress['stage']) => {
    switch (stage) {
      case 'setup':
        return 'text-blue-600 bg-blue-100';
      case 'crawling':
        return 'text-purple-600 bg-purple-100';
      case 'analyzing':
        return 'text-orange-600 bg-orange-100';
      case 'generating':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
          <Globe className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Run Your First Accessibility Scan
        </h2>
        
        <p className="text-lg text-gray-600">
          Enter your website URL and we'll scan it for WCAG compliance issues.
        </p>
      </div>

      {!scanStarted ? (
        <>
          {/* Website URL Input */}
          <div className="mb-8">
            <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <div className="relative">
              <input
                type="url"
                id="website-url"
                placeholder="https://your-website.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Globe className="absolute right-3 top-3 w-6 h-6 text-gray-400" />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              We'll scan the main page and discover linked pages automatically
            </p>
          </div>

          {/* Scan Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              What We'll Check
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-800">Alt text for images</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-800">Color contrast ratios</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-800">Heading structure</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-800">Form labels</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-800">ARIA attributes</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-800">Keyboard navigation</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-800">Focus indicators</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-blue-800">WCAG 2.2 AA compliance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Secure Scanning Process
                </h3>
                <ul className="text-green-800 space-y-1">
                  <li>• Ephemeral containers for processing</li>
                  <li>• No permanent data storage</li>
                  <li>• Results encrypted in transit</li>
                  <li>• Automatic cleanup after scan</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Start Scan Button */}
          <div className="text-center">
            <button
              onClick={handleStartScan}
              disabled={!websiteUrl || isLoading}
              className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search className="mr-3 w-5 h-5" />
              Start Accessibility Scan
            </button>
            
            <p className="mt-4 text-sm text-gray-500">
              Estimated time: 3-5 minutes
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Scan Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Scanning {websiteUrl}
              </h3>
              <span className="text-sm text-gray-500">
                {scanProgress.percentage}% complete
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${scanProgress.percentage}%` }}
              />
            </div>
            
            {/* Current Stage */}
            <div className="flex items-center p-4 bg-white border border-gray-200 rounded-lg">
              {(() => {
                const Icon = getScanStageIcon(scanProgress.stage);
                const colorClass = getScanStageColor(scanProgress.stage);
                return (
                  <>
                    <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center mr-4`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {scanProgress.message}
                      </p>
                      {scanProgress.estimatedTime && (
                        <p className="text-sm text-gray-500">
                          Estimated time remaining: {scanProgress.estimatedTime}
                        </p>
                      )}
                    </div>
                    
                    {scanProgress.stage !== 'completed' && (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Scan Results (when completed) */}
          {scanProgress.stage === 'completed' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="text-xl font-semibold text-green-900">
                      Scan Completed Successfully!
                    </h3>
                    <p className="text-green-800">
                      Found {userData.firstScan?.issuesFound || 0} accessibility issues that can be automatically fixed
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold text-red-600 mb-2">8</div>
                  <div className="text-sm text-gray-600">Critical Issues</div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-2">4</div>
                  <div className="text-sm text-gray-600">Warning Issues</div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">100%</div>
                  <div className="text-sm text-gray-600">Auto-Fixable</div>
                </div>
              </div>

              {/* Continue Button */}
              <div className="text-center">
                <button
                  onClick={handleContinue}
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Review Results & Generate Fixes
                  <ChevronRight className="ml-2 w-5 h-5" />
                </button>
                
                <p className="mt-4 text-sm text-gray-500">
                  See detailed results and AI-generated code fixes
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}