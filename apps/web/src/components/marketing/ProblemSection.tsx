import { AlertTriangle, Clock, DollarSign, Users } from 'lucide-react';

export function ProblemSection() {
  const problems = [
    {
      icon: AlertTriangle,
      stat: '67%',
      title: 'of websites have accessibility barriers',
      description: 'WebAIM study shows most sites fail basic accessibility tests',
    },
    {
      icon: Clock,
      stat: '2-6 weeks',
      title: 'for manual accessibility audits',
      description: 'Developer time is expensive and accessibility expertise is rare',
    },
    {
      icon: DollarSign,
      stat: '$5,000+',
      title: 'average cost of manual remediation',
      description: 'Consulting fees plus developer time for each audit cycle',
    },
    {
      icon: Users,
      stat: '1.3B',
      title: 'people worldwide have disabilities',
      description: 'Legal compliance risk is increasing with new regulations',
    },
  ];

  return (
    <section className="py-16 bg-red-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            The Accessibility Problem is Getting Worse
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Current tools only tell you what's broken. They don't help you fix it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {problems.map((problem) => (
            <div key={problem.title} className="text-center">
              <div className="inline-flex p-4 rounded-full bg-red-100 mb-4">
                <problem.icon className="w-8 h-8 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">{problem.stat}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{problem.title}</h3>
              <p className="text-sm text-gray-600">{problem.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg p-8 border-l-4 border-red-500">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-500 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                The Hidden Cost of Inaccessible Websites
              </h4>
              <p className="text-gray-600">
                Beyond legal risks, inaccessible websites lose customers, damage brand reputation, 
                and exclude users who rely on assistive technologies. Most teams know they need 
                to fix accessibility issues but lack the expertise and time to do it effectively.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}