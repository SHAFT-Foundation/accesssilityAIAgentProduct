'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface ProductTourProps {
  onClose: () => void;
  onComplete: () => void;
}

interface TourStep {
  title: string;
  description: string;
  image?: string;
  tips?: string[];
}

export function ProductTour({ onClose, onComplete }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps: TourStep[] = [
    {
      title: 'Welcome to Your Dashboard',
      description: 'Your central hub for monitoring accessibility across all your projects. View scan results, manage repositories, and track compliance over time.',
      tips: [
        'Check the overview for a quick health score',
        'Use filters to find specific issue types',
        'Set up notifications for new issues',
      ],
    },
    {
      title: 'Repository Management',
      description: 'Connect multiple repositories and configure scanning preferences. Each repository can have its own scan schedule and notification settings.',
      tips: [
        'Add repositories from the Repositories tab',
        'Configure automatic daily or weekly scans',
        'Set PR creation preferences',
      ],
    },
    {
      title: 'Scan Results & Reports',
      description: 'View detailed accessibility reports with AI-generated fixes. Track your progress over time and export compliance reports.',
      tips: [
        'Click on any issue to see the fix preview',
        'Export reports for compliance documentation',
        'Use the trend charts to track improvements',
      ],
    },
    {
      title: 'Pull Request Management',
      description: 'Monitor all PRs created by our AI, track their status, and measure the impact of your accessibility improvements.',
      tips: [
        'PRs are automatically tested before creation',
        'Review and merge fixes through your normal workflow',
        'Track metrics on fixes applied and issues resolved',
      ],
    },
    {
      title: 'Settings & Integrations',
      description: 'Customize scanning preferences, manage team access, configure notifications, and integrate with your existing tools.',
      tips: [
        'Set up Slack notifications for new issues',
        'Configure GitHub permissions and webhooks',
        'Manage billing and subscription settings',
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const currentTourStep = tourSteps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Product Tour
            </h2>
            <p className="text-sm text-gray-600">
              Step {currentStep + 1} of {tourSteps.length}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => handleStepClick(index)}
                className={`w-8 h-8 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-blue-600 text-white'
                    : index < currentStep
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index < currentStep ? (
                  <Check className="w-4 h-4 mx-auto" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </button>
            ))}
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Step Image Placeholder */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-12 mb-6 text-center">
            <div className="w-24 h-24 bg-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {currentStep + 1}
              </span>
            </div>
            <div className="text-blue-600 font-medium">
              Interactive demo would go here
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {currentTourStep.title}
            </h3>
            
            <p className="text-gray-600 mb-4">
              {currentTourStep.description}
            </p>

            {currentTourStep.tips && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  💡 Pro Tips:
                </h4>
                <ul className="space-y-1">
                  {currentTourStep.tips.map((tip, index) => (
                    <li key={index} className="text-sm text-blue-800 flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="mr-2 w-4 h-4" />
            Previous
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Skip Tour
            </button>
            
            <button
              onClick={handleNext}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {currentStep === tourSteps.length - 1 ? (
                <>
                  <Check className="mr-2 w-4 h-4" />
                  Finish Tour
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}