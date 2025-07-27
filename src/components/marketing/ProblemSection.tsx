import { AlertTriangle, Clock, DollarSign, Bot } from 'lucide-react';

export function ProblemSection() {
  const problems = [
    {
      icon: AlertTriangle,
      stat: '70%',
      title: 'of websites fail AI agent navigation',
      description: 'Sites without proper accessibility can\'t be read by AI agents, losing 40% of future traffic',
    },
    {
      icon: Bot,
      stat: '40%',
      title: 'of web traffic will be AI-driven by 2025',
      description: 'ChatGPT, Claude, and other AI assistants are becoming primary web navigators',
    },
    {
      icon: Clock,
      stat: '2-6 weeks',
      title: 'for manual accessibility audits',
      description: 'By the time you fix issues manually, AI agents have already passed you by',
    },
    {
      icon: DollarSign,
      stat: '$50B',
      title: 'AI agent economy value by 2026',
      description: 'Inaccessible sites will be invisible to this massive new traffic source',
    },
  ];

  return (
    <section className="py-16 bg-shaft-pink">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-shaft-black sm:text-4xl">
            AI Agents Are Already Here—Are You Ready?
          </h2>
          <p className="mt-4 text-lg text-shaft-gray">
            While you're still manually fixing accessibility issues, AI agents are choosing your competitors.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {problems.map((problem) => (
            <div key={problem.title} className="text-center">
              <div className="inline-flex p-4 rounded-full bg-white mb-4">
                <problem.icon className="w-8 h-8 text-shaft-red" />
              </div>
              <div className="text-3xl font-bold text-shaft-red mb-2">{problem.stat}</div>
              <h3 className="text-lg font-semibold text-shaft-black mb-2">{problem.title}</h3>
              <p className="text-sm text-shaft-gray">{problem.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-lg p-8 border-l-4 border-shaft-red">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-shaft-red mt-1 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-lg font-semibold text-shaft-black mb-2">
                The AI Agent Revolution is Here—And Most Sites Aren't Ready
              </h4>
              <p className="text-shaft-gray">
                AI agents from ChatGPT, Claude, and other providers need semantic HTML and ARIA labels 
                to navigate sites effectively. Without proper accessibility, your site is invisible 
                to the fastest-growing segment of web traffic. In the new AI economy, accessibility 
                isn't compliance—it's competitive advantage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}