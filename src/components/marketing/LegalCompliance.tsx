'use client';

import { Shield, FileCheck, BarChart3, HeadphonesIcon, AlertTriangle, CheckCircle, Users, Gavel } from 'lucide-react';

export function LegalCompliance() {
  const complianceFeatures = [
    {
      icon: Shield,
      title: "ADA, AODA & EAA Compliance",
      description: "Complete coverage for US ADA, Canadian AODA, and European EAA regulations. Our AI is trained on the latest legal requirements and case law.",
      highlight: "Multi-Jurisdiction Protection"
    },
    {
      icon: FileCheck,
      title: "Automated Proof of Effort",
      description: "Every scan, fix, and deployment is automatically documented. Generate court-ready evidence of your good-faith accessibility efforts instantly.",
      highlight: "Legal Documentation"
    },
    {
      icon: BarChart3,
      title: "Monthly Accessibility Impact Reports",
      description: "Detailed monthly reports showing measurable improvements, compliance progress, and risk reduction metrics. Perfect for legal teams and executives.",
      highlight: "Executive Reporting"
    },
    {
      icon: HeadphonesIcon,
      title: "Expert Customer Support",
      description: "Direct access to certified accessibility consultants who can provide expert testimony and legal documentation support if needed.",
      highlight: "Expert Testimony Available"
    },
    {
      icon: Gavel,
      title: "Litigation Support Package",
      description: "Comprehensive legal defense documentation, expert witness coordination, and technical testimony preparation. Available for Enterprise customers.",
      highlight: "Full Legal Defense"
    },
    {
      icon: Users,
      title: "Litigation Pledge",
      description: "If you face accessibility litigation while actively using our service, we stand behind you with documentation, expert support, and technical testimony.",
      highlight: "We Stand Behind You"
    }
  ];

  const protectionStats = [
    {
      value: "10,000+",
      label: "ADA lawsuits filed annually",
      description: "Protect your business before you become a target"
    },
    {
      value: "$150K",
      label: "Average lawsuit settlement",
      description: "Plus legal fees, remediation costs, and reputation damage"
    },
    {
      value: "18 months",
      label: "Average lawsuit duration",
      description: "Distraction from core business while defending in court"
    }
  ];

  return (
    <section className="bg-gradient-to-b from-red-50 via-white to-blue-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full bg-red-100 px-4 py-2 text-sm text-red-800 mb-6">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Legal Protection Required
          </div>
          
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Don't Just Fix Issues.{' '}
            <span className="text-red-600">Protect Your Business.</span>
          </h2>
          
          <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
            Accessibility lawsuits are skyrocketing. Our platform doesn't just ensure compliance — 
            it provides comprehensive legal protection and automated documentation to defend your business.
          </p>
        </div>

        {/* Risk Statistics */}
        <div className="mb-20 bg-white rounded-2xl shadow-xl border border-red-200 p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            The Accessibility Lawsuit Crisis
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {protectionStats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-4xl font-bold text-red-600 mb-2">{stat.value}</p>
                <p className="text-lg font-semibold text-gray-900 mb-2">{stat.label}</p>
                <p className="text-sm text-gray-600">{stat.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Features Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Complete Legal Protection & Compliance Suite
          </h3>
          <div className="grid lg:grid-cols-2 gap-8">
            {complianceFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xl font-semibold text-gray-900">{feature.title}</h4>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Remediation Reports */}
        <div className="mb-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-4">
                Detailed Remediation Reports
              </h3>
              <p className="text-blue-100 text-lg mb-6">
                Every action taken by our AI is documented with forensic-level detail. 
                Perfect for legal teams, compliance officers, and court proceedings.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3" />
                  <span>Timestamped audit trails of all accessibility improvements</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3" />
                  <span>Before/after code comparisons with WCAG compliance mapping</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3" />
                  <span>Expert analysis and recommendations for ongoing compliance</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-300 mr-3" />
                  <span>Monthly executive summaries showing measurable progress</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 text-gray-900">
              <div className="mb-4">
                <h4 className="font-semibold text-lg">Sample Report Extract</h4>
                <p className="text-sm text-gray-600">Monthly Accessibility Compliance Report</p>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span>Issues Identified & Fixed</span>
                  <span className="font-bold text-green-600">247</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                  <span>WCAG 2.2 AA Compliance</span>
                  <span className="font-bold text-blue-600">98.7%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                  <span>Risk Reduction</span>
                  <span className="font-bold text-purple-600">-89%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gray-900 rounded-2xl p-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Don't Wait for a Lawsuit
          </h3>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Every day without proper accessibility protection puts your business at risk. 
            Start protecting yourself today with automated compliance and legal documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => {
                const element = document.getElementById('waitlist');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg">
              Get Early Access - Protected Now
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('waitlist');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="border border-gray-600 text-gray-300 px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-lg">
              Join Early Access Waitlist
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}