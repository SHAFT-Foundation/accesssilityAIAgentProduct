import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - AI Accessibility Scanner',
  description: 'Terms of Service for AI Accessibility Scanner. Understand your rights and responsibilities when using our automated accessibility compliance platform.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-8">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  <strong>Service Overview:</strong> AI Accessibility Scanner automatically detects WCAG violations, 
                  generates code fixes, and submits GitHub PRs. Your code is processed in secure, ephemeral containers 
                  and never permanently stored.
                </p>
              </div>
            </div>
          </div>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using AI Accessibility Scanner ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.</p>

          <h2>2. Description of Service</h2>
          
          <h3>2.1 Core Functionality</h3>
          <p>Our Service provides:</p>
          <ul>
            <li>Automated accessibility scanning of websites and web applications</li>
            <li>AI-generated code fixes for WCAG compliance issues</li>
            <li>GitHub integration for pull request creation</li>
            <li>Real-time monitoring and reporting</li>
          </ul>

          <h3>2.2 Service Availability</h3>
          <p>We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be announced in advance.</p>

          <h2>3. User Accounts and Registration</h2>
          
          <h3>3.1 Account Creation</h3>
          <ul>
            <li>You must provide accurate and complete information</li>
            <li>You are responsible for maintaining account security</li>
            <li>You must notify us immediately of any unauthorized access</li>
            <li>One person may not maintain multiple accounts</li>
          </ul>

          <h3>3.2 Age Requirements</h3>
          <p>You must be at least 13 years old to use this Service. Users under 18 must have parental consent.</p>

          <h2>4. Subscription Plans and Billing</h2>
          
          <h3>4.1 Plan Types</h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold">Free Plan</h4>
                <ul className="text-sm mt-2">
                  <li>2 PRs per month</li>
                  <li>1 repository</li>
                  <li>Community support</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Pro Plan ($29.99/month)</h4>
                <ul className="text-sm mt-2">
                  <li>Unlimited PRs</li>
                  <li>1 repository</li>
                  <li>Priority support</li>
                  <li>Advanced reporting</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Enterprise</h4>
                <ul className="text-sm mt-2">
                  <li>Multiple repositories</li>
                  <li>Custom SLA</li>
                  <li>Dedicated support</li>
                  <li>On-premise options</li>
                </ul>
              </div>
            </div>
          </div>

          <h3>4.2 Billing Terms</h3>
          <ul>
            <li>Subscriptions are billed monthly or annually in advance</li>
            <li>Payments are processed by Stripe</li>
            <li>Failed payments may result in service suspension</li>
            <li>Refunds are provided per our refund policy (Section 11)</li>
          </ul>

          <h2>5. Acceptable Use Policy</h2>
          
          <h3>5.1 Permitted Uses</h3>
          <ul>
            <li>Scanning websites you own or have permission to test</li>
            <li>Creating pull requests for accessibility improvements</li>
            <li>Monitoring compliance with accessibility standards</li>
          </ul>

          <h3>5.2 Prohibited Uses</h3>
          <p>You may not:</p>
          <ul>
            <li>Scan websites without proper authorization</li>
            <li>Attempt to reverse engineer our AI models</li>
            <li>Use the service for any illegal or harmful purposes</li>
            <li>Interfere with or disrupt the service</li>
            <li>Share account credentials with others</li>
            <li>Abuse rate limits or attempt to overwhelm our systems</li>
          </ul>

          <h2>6. Repository Access and GitHub Integration</h2>
          
          <h3>6.1 Permissions Required</h3>
          <p>To provide our service, we request minimal GitHub permissions:</p>
          <ul>
            <li><strong>Repository Access:</strong> Read repository metadata and source code</li>
            <li><strong>Pull Request Creation:</strong> Create and update pull requests</li>
            <li><strong>Email Access:</strong> Retrieve your email for account management</li>
          </ul>

          <h3>6.2 Repository Security</h3>
          <ul>
            <li>Source code is processed in ephemeral, isolated containers</li>
            <li>No source code is permanently stored on our servers</li>
            <li>Only PR diffs are retained for audit purposes</li>
            <li>You can revoke access at any time through GitHub settings</li>
          </ul>

          <h2>7. Intellectual Property Rights</h2>
          
          <h3>7.1 Your Content</h3>
          <ul>
            <li>You retain all rights to your source code and repositories</li>
            <li>You grant us temporary access to process and analyze your code</li>
            <li>Generated fixes become part of your codebase under your license</li>
          </ul>

          <h3>7.2 Our Service</h3>
          <ul>
            <li>We retain all rights to our AI models and technology</li>
            <li>You may not copy, modify, or distribute our service</li>
            <li>Feedback and suggestions become our property</li>
          </ul>

          <h2>8. Privacy and Data Protection</h2>
          <p>Your privacy is important to us. Our data practices are detailed in our Privacy Policy, which includes:</p>
          <ul>
            <li>Ephemeral processing of source code</li>
            <li>SOC 2 Type II security certification</li>
            <li>GDPR and CCPA compliance</li>
            <li>No permanent storage of source code</li>
          </ul>

          <h2>9. Service Level Agreement (SLA)</h2>
          
          <h3>9.1 Uptime Commitment</h3>
          <ul>
            <li><strong>Free Plan:</strong> Best effort (no SLA)</li>
            <li><strong>Pro Plan:</strong> 99.5% monthly uptime</li>
            <li><strong>Enterprise:</strong> 99.9% monthly uptime with custom SLA</li>
          </ul>

          <h3>9.2 Performance Standards</h3>
          <ul>
            <li>Scan completion within 5 minutes for typical websites</li>
            <li>PR generation within 30 seconds of scan completion</li>
            <li>API response times under 200ms (95th percentile)</li>
          </ul>

          <h2>10. Limitation of Liability</h2>
          
          <h3>10.1 Service Limitations</h3>
          <p>The Service is provided "as is" without warranties. We do not guarantee:</p>
          <ul>
            <li>100% accuracy of accessibility scans</li>
            <li>Complete compatibility with all frameworks</li>
            <li>Error-free code generation</li>
            <li>Uninterrupted service availability</li>
          </ul>

          <h3>10.2 Liability Limits</h3>
          <ul>
            <li>Our liability is limited to the amount paid in the last 12 months</li>
            <li>We are not liable for indirect, consequential, or punitive damages</li>
            <li>You are responsible for reviewing and testing generated code</li>
          </ul>

          <h2>11. Cancellation and Refunds</h2>
          
          <h3>11.1 Cancellation</h3>
          <ul>
            <li>You may cancel your subscription at any time</li>
            <li>Service continues until the end of the billing period</li>
            <li>We may suspend or terminate accounts for violations</li>
          </ul>

          <h3>11.2 Refund Policy</h3>
          <ul>
            <li>Monthly subscriptions: No refunds (cancel anytime)</li>
            <li>Annual subscriptions: Pro-rated refunds within 30 days</li>
            <li>Enterprise: Custom refund terms in your agreement</li>
          </ul>

          <h2>12. Indemnification</h2>
          <p>You agree to indemnify and hold us harmless from claims arising from:</p>
          <ul>
            <li>Your use of the Service</li>
            <li>Violation of these Terms</li>
            <li>Infringement of third-party rights</li>
            <li>Your content or repositories</li>
          </ul>

          <h2>13. Governing Law and Disputes</h2>
          
          <h3>13.1 Governing Law</h3>
          <p>These Terms are governed by the laws of [Jurisdiction], without regard to conflict of law provisions.</p>

          <h3>13.2 Dispute Resolution</h3>
          <ul>
            <li>Informal resolution: Contact us first to resolve disputes</li>
            <li>Binding arbitration for claims under $10,000</li>
            <li>Jurisdiction: [Location] for larger claims</li>
          </ul>

          <h2>14. Changes to Terms</h2>
          <p>We may modify these Terms at any time. We will:</p>
          <ul>
            <li>Notify users via email 30 days before changes</li>
            <li>Post updates on our website</li>
            <li>Allow cancellation if you disagree with changes</li>
          </ul>

          <h2>15. Contact Information</h2>
          <p>For questions about these Terms:</p>
          <ul>
            <li><strong>Email:</strong> legal@accessibility-scanner.com</li>
            <li><strong>Support:</strong> support@accessibility-scanner.com</li>
            <li><strong>Address:</strong> [Company Address]</li>
          </ul>

          <div className="mt-12 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Questions?</h3>
            <p className="text-sm text-gray-700">
              These Terms are designed to be fair and transparent. If you have questions 
              or concerns, please contact our support team. We're here to help you 
              understand your rights and responsibilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}