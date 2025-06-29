import { ArrowRight, Search, Code, TestTube, GitPullRequest, Eye } from 'lucide-react';

export function ValueProposition() {
  const steps = [
    {
      icon: Search,
      title: 'Detects Issues',
      description: 'AI scans for WCAG violations',
      color: 'bg-red-100 text-red-600',
    },
    {
      icon: Code,
      title: 'Writes Code Fixes',
      description: 'Generates actual code solutions',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: TestTube,
      title: 'Runs Your Tests',
      description: 'Validates fixes don\'t break anything',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: GitPullRequest,
      title: 'Submits PRs',
      description: 'Creates reviewable pull requests',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Eye,
      title: 'You Review & Merge',
      description: 'Normal code review process',
      color: 'bg-blue-100 text-blue-600',
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Complete Automation from Detection to Deployment
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Unlike other tools that just give you a list of problems, we deliver working solutions.
          </p>
        </div>

        {/* Process Flow */}
        <div className="relative">
          {/* Desktop Flow */}
          <div className="hidden lg:flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.title} className="flex-1 text-center">
                <div className="relative">
                  {/* Step Circle */}
                  <div className={`mx-auto w-16 h-16 rounded-full ${step.color} flex items-center justify-center mb-4`}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  
                  {/* Arrow */}
                  {index < steps.length - 1 && (
                    <div className="absolute top-8 left-full w-full flex justify-center">
                      <ArrowRight className="w-6 h-6 text-gray-400 transform -translate-x-3" />
                    </div>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>

          {/* Mobile Flow */}
          <div className="lg:hidden space-y-8">
            {steps.map((step) => (
              <div key={step.title} className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-full ${step.color} flex items-center justify-center flex-shrink-0`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Differentiator */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              The Key Difference
            </h3>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-red-500 text-lg font-semibold mb-2">❌ Other Tools</div>
                <p className="text-gray-600">
                  &quot;You have 47 accessibility issues on line 23, 156, 289...&quot;
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Still need developers to understand and fix each issue
                </p>
              </div>
              <div className="text-center">
                <div className="text-green-500 text-lg font-semibold mb-2">✅ Our Tool</div>
                <p className="text-gray-600">
                  &quot;PR #42: Fix alt text issues + contrast problems&quot;
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Ready-to-review code that fixes the problems
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}