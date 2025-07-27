import { CheckCircle, GitPullRequest, TestTube, Zap } from 'lucide-react';

export function SolutionSection() {
  const benefits = [
    {
      icon: GitPullRequest,
      title: 'Actual Code Fixes',
      description: 'We submit PRs with working code, not just issue reports',
    },
    {
      icon: TestTube,
      title: 'Pre-tested Solutions',
      description: 'Each PR passes your existing test suite before submission',
    },
    {
      icon: CheckCircle,
      title: 'Normal Review Process',
      description: 'Fits into your existing Git workflow and code review',
    },
    {
      icon: Zap,
      title: 'Contextual & Intelligent',
      description: 'AI understands your codebase and follows your patterns',
    },
  ];

  return (
    <section className="py-16 bg-shaft-light-gray">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-shaft-black sm:text-4xl">
            The First AI Agent-Compatible Solution
          </h2>
          <p className="mt-4 text-lg text-shaft-gray">
            We don't just make sites accessible for humans—we ensure they work perfectly for AI agents too.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex items-start space-x-4">
              <div className="inline-flex p-3 rounded-lg bg-white border border-shaft-red">
                <benefit.icon className="w-6 h-6 text-shaft-red" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-shaft-black mb-2">
                  {benefit.title}
                </h3>
                <p className="text-shaft-gray">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Example PR */}
        <div className="bg-white rounded-lg border border-shaft-red p-6">
          <h3 className="text-lg font-semibold text-shaft-black mb-4">
            Example AI Agent-Compatible Fix
          </h3>
          <div className="bg-shaft-light-gray rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center space-x-2 mb-3">
              <GitPullRequest className="w-4 h-4 text-shaft-red" />
              <span className="font-semibold">#42 AI Agent compatibility + accessibility fixes</span>
              <span className="bg-shaft-pink text-shaft-red px-2 py-1 rounded text-xs">Open</span>
            </div>
            <div className="space-y-2 text-shaft-gray">
              <p>🤖 <strong>AI Agent Compatibility:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Enhanced semantic HTML for better AI navigation</li>
                <li>Added structured ARIA landmarks and roles</li>
                <li>Improved heading hierarchy for content parsing</li>
              </ul>
              <p>♿ <strong>Human Accessibility:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Added missing alt text to 3 images (WCAG 1.1.1)</li>
                <li>Improved color contrast for buttons (WCAG 1.4.3)</li>
              </ul>
              <p className="mt-3">✅ <strong>Tests:</strong> All 47 tests pass</p>
              <p>🎯 <strong>AI Agent Score:</strong> 67% → 98%</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-shaft-red mb-2">98%</div>
            <p className="text-shaft-gray">AI agent compatibility score</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-shaft-red mb-2">40%</div>
            <p className="text-shaft-gray">More traffic from AI agents</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-shaft-red mb-2">24/7</div>
            <p className="text-shaft-gray">Future-proof monitoring</p>
          </div>
        </div>
      </div>
    </section>
  );
}