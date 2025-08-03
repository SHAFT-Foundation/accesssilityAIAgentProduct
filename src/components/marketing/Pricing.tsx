'use client';

import { Check, ArrowRight, Shield, FileCheck, BarChart3, HeadphonesIcon } from 'lucide-react';
import { useState } from 'react';

export function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out the platform',
      features: [
        '1 repository',
        '2 PRs per month',
        'Basic WCAG 2.2 AA checks',
        'Email support',
        '7-day scan history',
        'Basic compliance reports',
      ],
      cta: 'Start Free',
      popular: false,
    },
    {
      name: 'Pro',
      price: isAnnual ? '$25' : '$29.99',
      period: 'month',
      description: 'For teams serious about accessibility',
      features: [
        '1 repository',
        'Unlimited PRs',
        'ADA, AODA & EAA compliance',
        'Monthly accessibility reports',
        'Automated proof of effort',
        'Priority customer support',
        'Detailed remediation reports',
        'Custom test integration',
        'Slack notifications',
      ],
      cta: 'Start Pro Trial',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      description: 'For organizations with multiple teams',
      features: [
        'Multiple repositories',
        'Unlimited PRs',
        'Full litigation support package',
        'Litigation pledge & legal defense',
        'Dedicated accessibility consultant',
        'Custom compliance reporting',
        'Priority support & SLA',
        'SSO authentication',
        'Custom integrations',
        'Court-ready documentation',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Start free, upgrade when you need more. No hidden fees.
          </p>

          {/* Annual/Monthly Toggle */}
          <div className="mt-8 flex items-center justify-center">
            <span className={`text-sm ${!isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`mx-3 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                isAnnual ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAnnual ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm ${isAnnual ? 'text-gray-900' : 'text-gray-500'}`}>
              Annual
            </span>
            {isAnnual && (
              <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                Save 20%
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border ${
                plan.popular
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 bg-white'
              } p-8`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period !== 'pricing' && (
                    <span className="text-gray-600">/{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  const element = document.getElementById('waitlist');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className={`mt-8 w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </button>
            </div>
          ))}
        </div>

        {/* Compliance Guarantee */}
        <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center border border-green-200">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-green-600 mr-3" />
            <h3 className="text-2xl font-bold text-gray-900">
              🛡️ Litigation Protection Guarantee
            </h3>
          </div>
          <p className="text-gray-700 mb-6 max-w-3xl mx-auto">
            <strong>Every paid plan includes our litigation defense pledge.</strong> If you face accessibility-related 
            legal action while actively using our service, we provide legal support documentation, 
            expert testimony, and proof of good-faith compliance efforts. Your accessibility improvements 
            are automatically documented for legal protection.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <FileCheck className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900">Automated Documentation</h4>
              <p className="text-sm text-gray-600 mt-1">Court-ready compliance reports generated automatically</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <BarChart3 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900">Impact Tracking</h4>
              <p className="text-sm text-gray-600 mt-1">Monthly reports showing measurable accessibility improvements</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <HeadphonesIcon className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <h4 className="font-semibold text-gray-900">Expert Support</h4>
              <p className="text-sm text-gray-600 mt-1">Accessibility consultants available for legal testimony</p>
            </div>
          </div>
        </div>

        {/* Enterprise Contact Form */}
        <div className="mt-8 bg-gray-50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Need Something Custom?
          </h3>
          <p className="text-gray-600 mb-6">
            Let's discuss your specific requirements for multiple repositories, 
            custom integrations, or enterprise legal protection features.
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
    </section>
  );
}