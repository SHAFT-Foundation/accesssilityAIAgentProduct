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
    <section className="relative overflow-hidden bg-white">
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          {/* Announcement Bar */}
          <div className="mx-auto mb-8 flex max-w-fit items-center rounded-full border border-shaft-red bg-shaft-pink px-4 py-2 text-sm">
            <span className="font-semibold text-shaft-red">🚀 WORLD'S FIRST</span>
            <span className="mx-2 text-shaft-gray">•</span>
            <span className="text-shaft-black font-medium">AI Agent-Compatible Accessibility Scanner</span>
          </div>

          {/* Main Headline */}
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-shaft-black sm:text-6xl">
            The First Scanner That Makes Sites{' '}
            <span className="text-shaft-red">
              AI Agent Compatible
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-3xl text-xl leading-8 text-shaft-black font-medium">
            In the AI agent economy, accessibility isn't a feature—it's a network advantage.
          </p>
          
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-shaft-gray">
            The only tool that ensures your site works for both humans AND AI agents. 
            We scan, write fixes, test them, and submit PRs—making your site ready for the 
            AI-powered future where agents evaluate and select each other.
          </p>

          {/* AI Agent Network Message */}
          <div className="mx-auto mt-6 max-w-3xl bg-shaft-light-gray border border-gray-200 rounded-lg p-4">
            <p className="text-center text-sm text-shaft-gray italic">
            "As AI agents begin to power everything from productivity tools to financial services, 
              those built with full accessibility and inclusion by design aren't just ethically aligned—they 
              are more <span className="text-shaft-red">interoperable</span>, 
              more likely to be <span className="text-shaft-red">adopted</span>, 
              and more <span className="text-shaft-red">trusted</span> in the emerging 
              networks of AI agents that interact, evaluate, and select one another.
              In this new paradigm, accessibility isn't a feature—it's a network advantage."
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button 
              className="group rounded-md bg-shaft-red px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shaft-red transition-all duration-200"
              onClick={handleStartFree}
            >
              Start Free - Get 2 PRs
              <ArrowRight className="ml-2 h-4 w-4 inline group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              className="group text-sm font-semibold leading-6 text-shaft-black hover:text-shaft-red transition-colors duration-200"
              onClick={handleWatchDemo}
            >
              <Play className="mr-2 h-4 w-4 inline" />
              See Live Demo
            </button>
          </div>

          {/* Social Proof */}
          <div className="mt-12">
            <p className="text-sm text-gray-500 mb-4">Built for modern development teams</p>
            <div className="flex items-center justify-center space-x-8 text-gray-400">
              <div className="flex items-center space-x-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm font-medium">GitHub</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352z"/>
                </svg>
                <span className="text-sm font-medium">VS Code</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747C20.756 4.249 17.6.394 13.708.071 13.082.02 12.056.008 11.572 0z"/>
                </svg>
                <span className="text-sm font-medium">Next.js</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Visual - Compact Dashboard Mockup */}
        <div className="mt-16 sm:mt-20">
          <div className="relative mx-auto max-w-4xl">
            {/* Browser Window Mockup */}
            <div className="rounded-xl bg-gray-900 shadow-2xl ring-1 ring-gray-900/10">
              {/* Browser Header */}
              <div className="flex items-center gap-2 bg-gray-800 px-4 py-3 rounded-t-xl">
                <div className="flex space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-700 rounded px-3 py-1 text-xs text-gray-300">
                    accessibility-scanner.com/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard Content */}
              <div className="bg-white rounded-b-xl p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Repository: my-website</h3>
                    <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>Scan Complete</span>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-red-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">23</p>
                      <p className="text-sm text-red-700">Issues Found</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">19</p>
                      <p className="text-sm text-blue-700">Auto-Fixed</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">1</p>
                      <p className="text-sm text-green-700">PR Created</p>
                    </div>
                  </div>
                  
                  {/* Issues List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded border-l-4 border-green-400">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Missing alt text on hero image</span>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Fixed</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded border-l-4 border-green-400">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Low contrast in navigation buttons</span>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Fixed</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm">Creating pull request...</span>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">In Progress</span>
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