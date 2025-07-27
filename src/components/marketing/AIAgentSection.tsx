'use client';

import { Bot, AlertCircle, TrendingUp, Shield } from 'lucide-react';

export function AIAgentSection() {
  const impacts = [
    {
      icon: Bot,
      title: "AI Agents Can't Navigate Broken Sites",
      description: "ChatGPT, Claude, and other AI assistants rely on semantic HTML and ARIA labels to understand and interact with websites. No accessibility = No AI traffic."
    },
    {
      icon: AlertCircle,
      title: "70% of Sites Will Fail AI Agents",
      description: "Research shows most websites lack the basic accessibility features AI agents need. These sites will be effectively invisible to AI-powered browsing."
    },
    {
      icon: TrendingUp,
      title: "AI Traffic Will Dominate by 2025",
      description: "Analysts predict 40% of web interactions will be AI-driven within 18 months. Can your competitors afford to capture this traffic while you can't?"
    },
    {
      icon: Shield,
      title: "Future-Proof Your Business Today",
      description: "Our AI scanner doesn't just ensure compliance – it guarantees your site is ready for the AI agent revolution. One scan, complete protection."
    }
  ];

  return (
    <section className="bg-gradient-to-b from-shaft-light-gray to-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header with Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="mb-6 inline-flex items-center rounded-full bg-shaft-pink px-4 py-2 text-sm text-shaft-red font-semibold">
              <Bot className="mr-2 h-4 w-4" />
              FIRST AI AGENT-COMPATIBLE SCANNER
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight text-shaft-black sm:text-4xl lg:text-5xl">
              AI Agents Can't Read{' '}
              <span className="text-shaft-red">Broken Websites</span>
            </h2>
            
            <p className="mt-6 text-lg leading-8 text-shaft-gray">
              We're the <span className="font-semibold text-shaft-black">first and only</span> scanner 
              designed specifically for AI agent compatibility. While others focus on human accessibility, 
              we ensure your site works for the AI-powered future.
            </p>

            <p className="mt-4 text-lg leading-8 text-shaft-black font-semibold">
              If your site isn't accessible, AI agents simply skip it. No exceptions.
            </p>

            <div className="mt-8 flex items-center space-x-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-shaft-red">40%</p>
                <p className="text-sm text-shaft-gray">of web traffic will be AI-driven by 2025</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-shaft-red">70%</p>
                <p className="text-sm text-shaft-gray">of sites fail AI navigation tests</p>
              </div>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative">
            <img
              className="rounded-2xl shadow-xl"
              src="https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
              alt="AI robot analyzing website accessibility code"
            />
            <div className="absolute -bottom-6 -left-6 bg-white rounded-lg shadow-lg p-4 border">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium">AI Agent: Site Inaccessible</span>
              </div>
            </div>
          </div>
        </div>

        {/* Impact Grid */}
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
            {impacts.map((impact) => (
              <div key={impact.title} className="relative bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7 text-gray-900">
                  <impact.icon className="h-6 w-6 flex-none text-red-600" aria-hidden="true" />
                  {impact.title}
                </dt>
                <dd className="mt-4 text-base leading-7 text-gray-600">
                  {impact.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Call to Action */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center shadow-xl">
          <h3 className="text-2xl font-bold text-white">
            Don't Let AI Agents Pass You By
          </h3>
          <p className="mt-4 text-lg text-blue-100">
            Every day without proper accessibility is a day you're invisible to AI agents. 
            Our scanner finds and fixes these issues automatically – no expertise required.
          </p>
          <button className="mt-6 rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-600 shadow-sm hover:bg-gray-50 transition-colors">
            Scan My Site Now – Stay AI-Visible
          </button>
        </div>

        {/* Stats Banner */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">2.5M+</p>
            <p className="mt-2 text-sm text-gray-600">AI agent requests blocked daily due to poor accessibility</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">$4.2B</p>
            <p className="mt-2 text-sm text-gray-600">Projected lost revenue from AI traffic by 2025</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">18 mo</p>
            <p className="mt-2 text-sm text-gray-600">Until AI agents become primary web navigators</p>
          </div>
        </div>
      </div>
    </section>
  );
}