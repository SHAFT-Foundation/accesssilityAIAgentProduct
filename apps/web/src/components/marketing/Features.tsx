import { GitBranch, TestTube, Accessibility, Zap, FileText, Settings } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: GitBranch,
      title: 'Smart PR Generation',
      description: 'Groups similar fixes, respects your code style',
    },
    {
      icon: TestTube,
      title: 'Test Integration',
      description: 'Runs your test suite before submitting',
    },
    {
      icon: Accessibility,
      title: 'WCAG 2.2 Coverage',
      description: 'Full AA and AAA compliance checks',
    },
    {
      icon: Zap,
      title: 'Real Review Process',
      description: 'PRs go through your normal workflow',
    },
    {
      icon: FileText,
      title: 'Incremental Fixes',
      description: 'Small, reviewable changes',
    },
    {
      icon: Settings,
      title: 'CI/CD Ready',
      description: 'Integrates with your pipeline',
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Built for Developer Workflows
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="bg-white p-6 rounded-lg border border-gray-200">
              <feature.icon className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}