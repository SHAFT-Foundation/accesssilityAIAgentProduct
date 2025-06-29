import { Shield, Lock, Eye, FileText, Server, Users, AlertTriangle, CheckCircle } from 'lucide-react';

export function SecuritySection() {
  const securityFeatures = [
    {
      icon: Server,
      title: 'Ephemeral Build Environments',
      description: 'Code is analyzed in isolated VMs that are destroyed after each PR',
      highlight: true,
    },
    {
      icon: Eye,
      title: 'Zero Code Retention',
      description: 'We never store your source code - only the PR diffs',
      highlight: true,
    },
    {
      icon: Shield,
      title: 'SOC 2 Type II Certified',
      description: 'Annual third-party security audits',
    },
    {
      icon: Users,
      title: 'Minimal GitHub Permissions',
      description: 'Only request repo and PR scopes',
    },
    {
      icon: Lock,
      title: 'Encrypted Data Transit',
      description: 'TLS 1.3 for all API communications',
    },
    {
      icon: FileText,
      title: 'GDPR & CCPA Compliant',
      description: 'Full data privacy compliance',
    },
    {
      icon: AlertTriangle,
      title: 'No Training on Your Code',
      description: 'Your code is never used to train AI models',
    },
    {
      icon: CheckCircle,
      title: 'Audit Logs',
      description: 'Complete trail of all actions for compliance',
    },
  ];

  const complianceStandards = [
    { name: 'SOC 2 Type II', status: 'Certified' },
    { name: 'HIPAA Compatible', status: 'Ready' },
    { name: 'ISO 27001', status: 'Certified' },
    { name: 'GDPR', status: 'Compliant' },
    { name: 'CCPA', status: 'Compliant' },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 mb-4">
            <Shield className="w-4 h-4 mr-2" />
            Enterprise-Grade Security
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Your Code, Your Control
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Built with enterprise security from day one. Your intellectual property is protected 
            with industry-leading security practices.
          </p>
        </div>

        {/* Security Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {securityFeatures.map((feature) => (
            <div 
              key={feature.title}
              className={`p-6 rounded-lg ${
                feature.highlight 
                  ? 'bg-blue-50 border-2 border-blue-200' 
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className={`inline-flex p-3 rounded-lg ${
                feature.highlight ? 'bg-blue-100' : 'bg-gray-100'
              } mb-4`}>
                <feature.icon className={`w-6 h-6 ${
                  feature.highlight ? 'text-blue-600' : 'text-gray-600'
                }`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Security Process */}
        <div className="bg-white rounded-2xl p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            How We Protect Your Code
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Server className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">1. Isolated Processing</h4>
              <p className="text-sm text-gray-600">
                Your code is cloned into an ephemeral VM that's completely isolated from other customers
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-yellow-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">2. Secure Analysis</h4>
              <p className="text-sm text-gray-600">
                AI analysis happens in the secure environment with no external network access
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">3. Complete Destruction</h4>
              <p className="text-sm text-gray-600">
                VM and all data are permanently destroyed after PR creation - nothing persists
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Standards */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Compliance & Certifications
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {complianceStandards.map((standard) => (
              <div 
                key={standard.name}
                className="inline-flex items-center bg-white border border-gray-200 rounded-full px-4 py-2"
              >
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">{standard.name}</span>
                <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  {standard.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}