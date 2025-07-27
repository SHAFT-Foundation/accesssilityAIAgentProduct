'use client';

import { Network, Zap, Shield, TrendingUp } from 'lucide-react';

export function NetworkAdvantage() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-shaft-pink border border-shaft-red mb-4">
            <Zap className="w-4 h-4 text-shaft-red mr-2" />
            <span className="text-sm font-semibold text-shaft-red">NETWORK ADVANTAGE</span>
          </div>
          <h2 className="text-4xl font-bold text-shaft-black mb-4">
            Why AI Agents Choose Accessible Sites
          </h2>
          <p className="text-xl text-shaft-gray max-w-3xl mx-auto">
            In the emerging AI agent economy, accessibility is your competitive edge. 
            Sites that work for everyone work better for AI.
          </p>
        </div>

        {/* Key Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-shaft-pink rounded-full flex items-center justify-center mb-4">
              <Network className="w-8 h-8 text-shaft-red" />
            </div>
            <h3 className="text-xl font-semibold text-shaft-black mb-2">
              Agent Interoperability
            </h3>
            <p className="text-shaft-gray">
              AI agents from different providers can seamlessly interact with your accessible interfaces, 
              expanding your reach across the AI ecosystem.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-shaft-pink rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-shaft-red" />
            </div>
            <h3 className="text-xl font-semibold text-shaft-black mb-2">
              Trust & Selection
            </h3>
            <p className="text-shaft-gray">
              When AI agents evaluate services, accessible sites signal reliability and professionalism, 
              making them preferred choices in automated decision-making.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-shaft-pink rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-shaft-red" />
            </div>
            <h3 className="text-xl font-semibold text-shaft-black mb-2">
              Future-Proof Growth
            </h3>
            <p className="text-shaft-gray">
              As AI agents handle more transactions and interactions, accessible sites capture 
              exponentially more traffic and opportunities.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-shaft-light-gray rounded-2xl p-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-shaft-red mb-2">40%</p>
              <p className="text-sm text-shaft-gray">
                of web traffic will be AI-driven by 2025
              </p>
            </div>
            <div>
              <p className="text-4xl font-bold text-shaft-red mb-2">70%</p>
              <p className="text-sm text-shaft-gray">
                of sites fail AI agent navigation tests
              </p>
            </div>
            <div>
              <p className="text-4xl font-bold text-shaft-red mb-2">3x</p>
              <p className="text-sm text-shaft-gray">
                higher adoption for accessible AI services
              </p>
            </div>
            <div>
              <p className="text-4xl font-bold text-shaft-red mb-2">$50B</p>
              <p className="text-sm text-shaft-gray">
                AI agent economy value by 2026
              </p>
            </div>
          </div>
        </div>

        {/* Quote Section */}
        <div className="mt-16 text-center">
          <blockquote className="max-w-4xl mx-auto">
            <p className="text-xl font-semibold text-shaft-black italic leading-relaxed">
              "As AI agents begin to power everything from productivity tools to financial services, 
              those built with full accessibility and inclusion by design aren't just ethically aligned—they 
              are more <span className="text-shaft-red">interoperable</span>, 
              more likely to be <span className="text-shaft-red">adopted</span>, 
              and more <span className="text-shaft-red">trusted</span> in the emerging 
              networks of AI agents that interact, evaluate, and select one another.
              In this new paradigm, accessibility isn't a feature—it's a network advantage."
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}