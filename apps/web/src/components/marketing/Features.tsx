import { GitBranch, TestTube, Accessibility, Zap, FileText, Settings, Shield, BarChart3, HeadphonesIcon, FileCheck } from 'lucide-react';

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
      title: 'ADA, AODA & EAA Compliance',
      description: 'Full WCAG 2.2 AA/AAA + regional accessibility laws',
    },
    {
      icon: Shield,
      title: 'Litigation Protection',
      description: 'Legal defense package with automated proof of effort',
    },
    {
      icon: BarChart3,
      title: 'Monthly Impact Reports',
      description: 'Detailed accessibility metrics and remediation tracking',
    },
    {
      icon: HeadphonesIcon,
      title: 'Dedicated Support',
      description: 'Expert accessibility consultants available 24/7',
    },
    {
      icon: FileCheck,
      title: 'Automated Documentation',
      description: 'Court-ready compliance reports and audit trails',
    },
    {
      icon: Settings,
      title: 'CI/CD Ready',
      description: 'Integrates with your existing development pipeline',
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Complete Legal Protection & Compliance
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            More than just code fixes — we provide comprehensive legal protection, 
            automated compliance documentation, and expert support to defend against accessibility litigation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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