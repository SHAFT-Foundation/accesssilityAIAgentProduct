'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronRight, GitBranch, Globe, Zap, Shield } from 'lucide-react';
import { WelcomeStep } from './WelcomeStep';
import { ConnectRepositoryStep } from './ConnectRepositoryStep';
import { FirstScanStep } from './FirstScanStep';
import { ReviewResultsStep } from './ReviewResultsStep';
import { ProductTour } from './ProductTour';

interface OnboardingState {
  currentStep: number;
  completedSteps: Set<number>;
  userData: {
    name?: string;
    email?: string;
    connectedRepo?: {
      name: string;
      url: string;
    };
    firstScan?: {
      id: string;
      status: 'pending' | 'completed';
      issuesFound: number;
    };
  };
}

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'Welcome',
    description: 'Learn how AI Accessibility Scanner works',
    icon: Zap,
    estimatedTime: '2 min',
  },
  {
    id: 2,
    title: 'Connect Repository',
    description: 'Link your GitHub repository',
    icon: GitBranch,
    estimatedTime: '3 min',
  },
  {
    id: 3,
    title: 'First Scan',
    description: 'Scan your website for accessibility issues',
    icon: Globe,
    estimatedTime: '5 min',
  },
  {
    id: 4,
    title: 'Review Results',
    description: 'See your accessibility report and fixes',
    icon: Shield,
    estimatedTime: '10 min',
  },
];

export function OnboardingFlow() {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    completedSteps: new Set(),
    userData: {},
  });
  
  const [showProductTour, setShowProductTour] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load onboarding state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('onboarding_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState(prev => ({
          ...prev,
          ...parsed,
          completedSteps: new Set(parsed.completedSteps || []),
        }));
      } catch (error) {
        console.error('Failed to parse onboarding state:', error);
      }
    }
  }, []);

  // Save onboarding state to localStorage
  useEffect(() => {
    const stateToSave = {
      ...state,
      completedSteps: Array.from(state.completedSteps),
    };
    localStorage.setItem('onboarding_state', JSON.stringify(stateToSave));
  }, [state]);

  const updateUserData = (updates: Partial<OnboardingState['userData']>) => {
    setState(prev => ({
      ...prev,
      userData: { ...prev.userData, ...updates },
    }));
  };

  const completeStep = (stepId: number) => {
    setState(prev => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, stepId]),
    }));
  };

  const goToNextStep = () => {
    if (state.currentStep < ONBOARDING_STEPS.length) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    }
  };

  const goToStep = (stepId: number) => {
    setState(prev => ({
      ...prev,
      currentStep: stepId,
    }));
  };

  const startProductTour = () => {
    setShowProductTour(true);
  };

  const currentStepData = ONBOARDING_STEPS.find(step => step.id === state.currentStep);
  const totalSteps = ONBOARDING_STEPS.length;
  const completedCount = state.completedSteps.size;
  const progressPercentage = (completedCount / totalSteps) * 100;

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <WelcomeStep
            onNext={goToNextStep}
            onComplete={() => completeStep(1)}
            userData={state.userData}
            updateUserData={updateUserData}
          />
        );
      case 2:
        return (
          <ConnectRepositoryStep
            onNext={goToNextStep}
            onComplete={() => completeStep(2)}
            userData={state.userData}
            updateUserData={updateUserData}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      case 3:
        return (
          <FirstScanStep
            onNext={goToNextStep}
            onComplete={() => completeStep(3)}
            userData={state.userData}
            updateUserData={updateUserData}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      case 4:
        return (
          <ReviewResultsStep
            onComplete={() => completeStep(4)}
            userData={state.userData}
            startProductTour={startProductTour}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to AI Accessibility Scanner
          </h1>
          <p className="text-lg text-gray-600">
            Let's get you set up in just a few minutes
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {state.currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressPercentage)}% complete
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {ONBOARDING_STEPS.map((step, stepIdx) => (
                <li
                  key={step.id}
                  className={`relative ${
                    stepIdx !== ONBOARDING_STEPS.length - 1 ? 'pr-8 sm:pr-20' : ''
                  }`}
                >
                  {stepIdx !== ONBOARDING_STEPS.length - 1 && (
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="h-0.5 w-full bg-gray-200" />
                    </div>
                  )}
                  
                  <button
                    onClick={() => goToStep(step.id)}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      state.completedSteps.has(step.id)
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : state.currentStep === step.id
                        ? 'border-2 border-blue-600 bg-white'
                        : 'border-2 border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    aria-current={state.currentStep === step.id ? 'step' : undefined}
                  >
                    {state.completedSteps.has(step.id) ? (
                      <Check className="h-5 w-5 text-white" aria-hidden="true" />
                    ) : (
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          state.currentStep === step.id ? 'bg-blue-600' : 'bg-transparent'
                        }`}
                      />
                    )}
                  </button>
                  
                  <div className="mt-2">
                    <span
                      className={`text-xs font-medium ${
                        state.currentStep === step.id || state.completedSteps.has(step.id)
                          ? 'text-blue-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Current Step Info */}
        {currentStepData && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <currentStepData.icon className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-blue-900">
                  {currentStepData.title}
                </h2>
                <p className="text-sm text-blue-700">
                  {currentStepData.description} • Estimated time: {currentStepData.estimatedTime}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {renderCurrentStep()}
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Check out our{' '}
            <a href="/docs" className="text-blue-600 hover:text-blue-700">
              documentation
            </a>{' '}
            or{' '}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">
              contact support
            </a>
          </p>
        </div>
      </div>

      {/* Product Tour Modal */}
      {showProductTour && (
        <ProductTour
          onClose={() => setShowProductTour(false)}
          onComplete={() => {
            setShowProductTour(false);
            // Redirect to dashboard
            window.location.href = '/dashboard';
          }}
        />
      )}
    </>
  );
}