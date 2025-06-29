'use client';

import { useState } from 'react';
import { ArrowRight, Play, CheckCircle } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function Hero() {
  const [showDemo, setShowDemo] = useState(false);
  const analytics = useAnalytics();

  const handleStartFree = () => {
    analytics.clickCTA('start_free_hero', 'hero_section');
    window.scrollTo({ top: document.getElementById('pricing')?.offsetTop, behavior: 'smooth' });
  };

  const handleWatchDemo = () => {
    analytics.clickCTA('watch_demo_hero', 'hero_section');
    setShowDemo(true);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          {/* Announcement Bar */}
          <div className="mx-auto mb-8 flex max-w-fit items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm">
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            <span className="text-gray-600">SOC 2 Certified • GDPR Compliant • Zero Code Storage</span>
          </div>

          {/* Main Headline */}
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            We Don&apos;t Just Find Issues.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              We Fix Them.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            The only accessibility tool that submits PRs with actual code fixes. 
            Our AI agents scan your site, write the fix, test it, and submit a PR. 
            You just review and merge.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button 
              className="group rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200"
              onClick={handleStartFree}
            >
              Start Free - Get 2 PRs
              <ArrowRight className="ml-2 h-4 w-4 inline group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              className="group text-sm font-semibold leading-6 text-gray-900 hover:text-blue-600 transition-colors duration-200"
              onClick={handleWatchDemo}
            >
              <Play className="mr-2 h-4 w-4 inline" />
              See Live Demo
            </button>
          </div>

          {/* Social Proof */}
          <div className="mt-12">
            <p className="text-sm text-gray-500 mb-4">Trusted by developers at</p>
            <div className="flex items-center justify-center space-x-8 grayscale opacity-50">
              {/* Placeholder logos - replace with actual customer logos */}
              <div className="h-8 w-24 bg-gray-300 rounded" />
              <div className="h-8 w-24 bg-gray-300 rounded" />
              <div className="h-8 w-24 bg-gray-300 rounded" />
              <div className="h-8 w-24 bg-gray-300 rounded" />
            </div>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-16 flow-root sm:mt-24">
          <div className="relative rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:rounded-2xl lg:p-4">
            <div className="rounded-md bg-white shadow-2xl ring-1 ring-gray-900/10">
              {/* Mockup of the dashboard */}
              <div className="p-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="border-t pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div className="h-3 w-64 bg-green-100 rounded" />
                      </div>
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div className="h-3 w-48 bg-green-100 rounded" />
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="h-5 w-5 bg-blue-500 rounded-full animate-spin" />
                        <div className="h-3 w-56 bg-blue-100 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Live Demo</h3>
              <button 
                onClick={() => setShowDemo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Demo video placeholder</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}