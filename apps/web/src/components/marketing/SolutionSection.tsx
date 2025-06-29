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
    <section className="py-16 bg-green-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            The Solution: Automated Fixes, Not Just Detection
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Our AI agents don't just find problems - they solve them with working code.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex items-start space-x-4">
              <div className="inline-flex p-3 rounded-lg bg-green-100">
                <benefit.icon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Example PR */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Example Pull Request from Our AI
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center space-x-2 mb-3">
              <GitPullRequest className="w-4 h-4 text-green-600" />
              <span className="font-semibold">#42 Fix accessibility issues: alt text and contrast</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Open</span>
            </div>
            <div className="space-y-2 text-gray-700">
              <p>🔍 <strong>Issues Fixed:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Added missing alt text to 3 images (WCAG 1.1.1)</li>
                <li>Improved color contrast for buttons (WCAG 1.4.3)</li>
                <li>Added ARIA labels to form inputs (WCAG 1.3.1)</li>
              </ul>
              <p className="mt-3">✅ <strong>Tests:</strong> All 47 tests pass</p>
              <p>📊 <strong>Accessibility Score:</strong> 89% → 96%</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">75%</div>
            <p className="text-gray-600">Faster than manual fixes</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">90%</div>
            <p className="text-gray-600">Cost reduction vs. consulting</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
            <p className="text-gray-600">Continuous compliance monitoring</p>
          </div>
        </div>
      </div>
    </section>
  );
}