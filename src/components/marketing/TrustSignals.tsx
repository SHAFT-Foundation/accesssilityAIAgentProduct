import { Shield, CheckCircle } from 'lucide-react';

export function TrustSignals() {
  const badges = [
    { name: 'SOC 2 Type II', icon: Shield },
    { name: 'HIPAA Compatible', icon: Shield },
    { name: 'Zero Source Code Storage', icon: CheckCircle },
    { name: 'ISO 27001 Certified', icon: Shield },
  ];

  const stats = [
    { value: '10,000+', label: 'Issues Fixed' },
    { value: '500+', label: 'Repositories Connected' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '< 30s', label: 'Average Scan Time' },
  ];

  return (
    <section className="py-16 bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Trust Badges */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-8">Trusted by Enterprise Teams</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {badges.map((badge) => (
              <div key={badge.name} className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg">
                <badge.icon className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-blue-400 mb-2">{stat.value}</div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="mt-16 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Fix Your Accessibility Issues?</h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join the developers who have automated their accessibility compliance. 
            Get started with 2 free PRs - no credit card required.
          </p>
          <button 
            onClick={() => {
              const element = document.getElementById('waitlist');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors">
            Get Early Access
          </button>
        </div>
      </div>
    </section>
  );
}