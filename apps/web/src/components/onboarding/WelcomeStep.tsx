'use client';

import { useState } from 'react';
import { ChevronRight, Search, Code, TestTube, GitPullRequest, Eye, Zap } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface WelcomeStepProps {
  onNext: () => void;
  onComplete: () => void;
  userData: any;
  updateUserData: (updates: any) => void;
}

export function WelcomeStep({ onNext, onComplete, userData, updateUserData }: WelcomeStepProps) {
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('free');
  const analytics = useAnalytics();

  const handleContinue = () => {
    analytics.completeOnboardingStep(1, 'welcome');
    analytics.track('onboarding_plan_selected', { plan: selectedPlan });
    updateUserData({ selectedPlan });
    onComplete();
    onNext();
  };

  const handlePlanSelect = (plan: 'free' | 'pro') => {
    analytics.track('onboarding_plan_viewed', { plan });
    setSelectedPlan(plan);
  };

  const features = [
    {
      icon: Search,
      title: 'AI Scans Your Site',
      description: 'Our AI thoroughly analyzes your website for WCAG compliance issues',
      color: 'text-red-600 bg-red-100',
    },
    {
      icon: Code,
      title: 'Generates Code Fixes',
      description: 'Creates actual working code that fixes accessibility violations',
      color: 'text-orange-600 bg-orange-100',
    },
    {
      icon: TestTube,
      title: 'Runs Your Tests',
      description: 'Validates that fixes don\'t break existing functionality',
      color: 'text-yellow-600 bg-yellow-100',
    },
    {
      icon: GitPullRequest,
      title: 'Creates Pull Requests',
      description: 'Submits PRs through your normal code review process',
      color: 'text-green-600 bg-green-100',
    },
    {
      icon: Eye,
      title: 'You Review & Merge',
      description: 'Final approval stays with your development team',
      color: 'text-blue-600 bg-blue-100',
    },
  ];

  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: '$0',
      period: '/month',
      description: 'Perfect for trying out the service',
      features: [
        '2 PRs per month',
        '1 repository',
        'Basic accessibility scanning',
        'Community support',
      ],
      highlight: false,
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: '$29.99',
      period: '/month',
      description: 'For serious accessibility compliance',
      features: [
        'Unlimited PRs',
        '1 repository',
        'Advanced scanning with AI fixes',
        'Priority support',
        'Detailed reporting',
        'Custom integrations',
      ],
      highlight: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
          <Zap className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          We Don't Just Find Issues. We Fix Them.
        </h2>
        
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Unlike other accessibility tools that just give you a list of problems, 
          we automatically generate code fixes and submit them as GitHub pull requests.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">✓</span>
              </div>
            </div>
            <div className="ml-3 text-left">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Enterprise-Grade Security
              </h3>
              <p className="text-green-800">
                Your source code is processed in ephemeral containers and never stored. 
                We're SOC 2 Type II certified with zero code retention.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
          How It Works
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {features.map((feature, index) => (
            <div key={feature.title} className="text-center">
              <div className={`w-12 h-12 rounded-full ${feature.color} flex items-center justify-center mx-auto mb-4`}>
                <feature.icon className="w-6 h-6" />
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-2">
                {feature.title}
              </h4>
              
              <p className="text-sm text-gray-600">
                {feature.description}
              </p>
              
              {index < features.length - 1 && (
                <div className="hidden md:block mt-6">
                  <ChevronRight className="w-5 h-5 text-gray-400 mx-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Plan Selection */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Choose Your Plan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-lg border-2 p-6 cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${plan.highlight ? 'bg-blue-50' : 'bg-white'}`}
              onClick={() => handlePlanSelect(plan.id as 'free' | 'pro')}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h4>
                
                <div className="mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-600">
                    {plan.period}
                  </span>
                </div>
                
                <p className="text-gray-600">
                  {plan.description}
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-600 text-xs font-bold">✓</span>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="text-center">
                <div className={`w-6 h-6 rounded-full border-2 mx-auto ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedPlan === plan.id && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-1" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Continue Button */}
      <div className="text-center">
        <button
          onClick={handleContinue}
          className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Get Started with {selectedPlan === 'free' ? 'Free Plan' : 'Pro Plan'}
          <ChevronRight className="ml-2 w-5 h-5" />
        </button>
        
        <p className="mt-4 text-sm text-gray-500">
          You can upgrade or downgrade at any time
        </p>
      </div>
    </div>
  );
}