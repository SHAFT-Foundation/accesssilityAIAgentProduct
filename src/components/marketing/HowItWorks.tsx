import { Github, Scan, Bot, TestTube2, Eye } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Github,
      title: 'Connect Your GitHub Repository',
      description: 'One-click OAuth integration with minimal permissions',
      details: ['Read repository access', 'Create pull requests', 'No admin permissions needed'],
    },
    {
      icon: Scan,
      title: 'Our AI Scans for Accessibility Issues',
      description: 'Comprehensive WCAG 2.2 compliance analysis',
      details: ['Alt text validation', 'Color contrast analysis', 'Keyboard navigation', 'ARIA compliance'],
    },
    {
      icon: Bot,
      title: 'AI Generates Code Fixes',
      description: 'For each issue type, we create a targeted fix',
      details: ['Respects your code style', 'Groups similar issues', 'Contextual solutions', 'Framework-aware'],
    },
    {
      icon: TestTube2,
      title: 'Runs Your Test Suite',
      description: 'Validates fixes don\'t break existing functionality',
      details: ['npm test, yarn test', 'Jest, Vitest, Cypress', 'Custom test commands', 'Exit on failure'],
    },
    {
      icon: Eye,
      title: 'Your Team Reviews & Merges',
      description: 'Normal code review process with detailed explanations',
      details: ['Before/after screenshots', 'WCAG criteria explained', 'Test results included', 'Security notes'],
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Simple setup, powerful automation. Get started in under 5 minutes.
          </p>
        </div>

        <div className="space-y-12">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Timeline Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-8 top-20 w-0.5 h-12 bg-gray-200 hidden md:block" />
              )}
              
              <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6">
                {/* Step Number & Icon */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <div className="md:hidden">
                    <step.icon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    <div className="hidden md:block">
                      <step.icon className="w-8 h-8 text-blue-600 mt-1" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{step.description}</p>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex items-center text-sm text-gray-500">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="bg-blue-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Automate Your Accessibility Compliance?
            </h3>
            <p className="text-gray-600 mb-6">
              Join hundreds of developers who have automated their accessibility workflow.
            </p>
            <button 
              onClick={() => {
                const element = document.getElementById('waitlist');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Get Early Access
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}