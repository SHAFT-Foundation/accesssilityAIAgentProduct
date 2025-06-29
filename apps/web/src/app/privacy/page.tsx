import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - AI Accessibility Scanner',
  description: 'Privacy Policy for AI Accessibility Scanner. Learn how we protect your data with enterprise-grade security and zero source code retention.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Key Privacy Highlights:</strong> We use ephemeral containers and never store your source code. 
                  Your code is processed temporarily and destroyed after each PR. We're SOC 2 Type II certified.
                </p>
              </div>
            </div>
          </div>

          <h2>1. Information We Collect</h2>
          
          <h3>1.1 Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Email address</li>
            <li>Name (optional)</li>
            <li>Profile picture (from OAuth provider)</li>
            <li>GitHub username (if connecting via GitHub)</li>
          </ul>

          <h3>1.2 Repository Access</h3>
          <p>With your explicit permission, we access:</p>
          <ul>
            <li>Repository metadata (name, description, default branch)</li>
            <li>Source code files for scanning (processed in ephemeral containers)</li>
            <li>Pull request creation permissions</li>
          </ul>

          <h3>1.3 Usage Data</h3>
          <p>We automatically collect:</p>
          <ul>
            <li>Scan results and accessibility issue reports</li>
            <li>Service usage metrics and performance data</li>
            <li>Error logs and diagnostic information</li>
            <li>Payment and billing information (processed by Stripe)</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          
          <h3>2.1 Service Provision</h3>
          <ul>
            <li>Scanning your websites for accessibility issues</li>
            <li>Generating code fixes and creating pull requests</li>
            <li>Managing your account and subscription</li>
            <li>Providing customer support</li>
          </ul>

          <h3>2.2 Service Improvement</h3>
          <ul>
            <li>Analyzing usage patterns to improve our AI models</li>
            <li>Monitoring service performance and reliability</li>
            <li>Developing new features and capabilities</li>
          </ul>

          <h2>3. Data Security and Source Code Protection</h2>
          
          <h3>3.1 Ephemeral Processing</h3>
          <p><strong>Critical Security Feature:</strong> Your source code is never permanently stored. We process code in ephemeral Docker containers that are:</p>
          <ul>
            <li>Created fresh for each scan</li>
            <li>Completely destroyed after PR generation</li>
            <li>Network isolated during processing</li>
            <li>Automatically cleaned up within minutes</li>
          </ul>

          <h3>3.2 Data Retention</h3>
          <ul>
            <li><strong>Source Code:</strong> Never stored (ephemeral processing only)</li>
            <li><strong>Scan Results:</strong> Retained for 90 days</li>
            <li><strong>PR Diffs:</strong> Stored only for audit trail (no full source)</li>
            <li><strong>Account Data:</strong> Retained until account deletion</li>
          </ul>

          <h3>3.3 Security Measures</h3>
          <ul>
            <li>SOC 2 Type II certified security controls</li>
            <li>TLS 1.3 encryption for all data in transit</li>
            <li>AES-256 encryption for data at rest</li>
            <li>Multi-factor authentication for admin access</li>
            <li>Regular security audits and penetration testing</li>
          </ul>

          <h2>4. Data Sharing and Disclosure</h2>
          
          <h3>4.1 We DO NOT Share</h3>
          <ul>
            <li>Your source code (never stored)</li>
            <li>Repository contents or business logic</li>
            <li>Proprietary information or trade secrets</li>
            <li>Personal data for marketing purposes</li>
          </ul>

          <h3>4.2 Limited Sharing</h3>
          <p>We only share data in these circumstances:</p>
          <ul>
            <li><strong>Service Providers:</strong> Trusted partners (Stripe for payments, AWS for hosting) under strict data protection agreements</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
            <li><strong>Business Transfer:</strong> In case of merger or acquisition (with user notification)</li>
          </ul>

          <h2>5. Your Rights and Controls</h2>
          
          <h3>5.1 Data Access and Portability</h3>
          <ul>
            <li>View all data we have about you</li>
            <li>Export your scan results and account data</li>
            <li>Request data correction or updates</li>
          </ul>

          <h3>5.2 Data Deletion</h3>
          <ul>
            <li>Delete individual scan results</li>
            <li>Disconnect repository access</li>
            <li>Delete your entire account and all associated data</li>
          </ul>

          <h3>5.3 Communication Preferences</h3>
          <ul>
            <li>Opt out of non-essential emails</li>
            <li>Choose notification preferences</li>
            <li>Control marketing communications</li>
          </ul>

          <h2>6. International Data Transfers</h2>
          <p>Your data may be processed in:</p>
          <ul>
            <li>United States (primary data centers)</li>
            <li>European Union (for EU customers)</li>
            <li>Other regions with adequate data protection</li>
          </ul>
          <p>All transfers comply with GDPR, CCPA, and other applicable privacy laws.</p>

          <h2>7. Cookies and Tracking</h2>
          
          <h3>7.1 Essential Cookies</h3>
          <ul>
            <li>Authentication and session management</li>
            <li>Security and fraud prevention</li>
            <li>Service functionality</li>
          </ul>

          <h3>7.2 Analytics and Performance</h3>
          <ul>
            <li>Google Analytics (anonymized)</li>
            <li>Performance monitoring</li>
            <li>Error tracking</li>
          </ul>

          <h2>8. Children's Privacy</h2>
          <p>Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the information immediately.</p>

          <h2>9. Changes to This Policy</h2>
          <p>We may update this privacy policy to reflect changes in our practices or for legal compliance. We will:</p>
          <ul>
            <li>Notify you via email of material changes</li>
            <li>Post updates on our website</li>
            <li>Provide 30 days notice for significant changes</li>
          </ul>

          <h2>10. Contact Us</h2>
          <p>For privacy-related questions or requests:</p>
          <ul>
            <li><strong>Email:</strong> privacy@accessibility-scanner.com</li>
            <li><strong>Data Protection Officer:</strong> dpo@accessibility-scanner.com</li>
            <li><strong>Address:</strong> [Company Address]</li>
          </ul>

          <h2>11. Compliance Certifications</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">We comply with:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">🇪🇺 GDPR (EU)</h4>
                <p className="text-sm text-gray-600">General Data Protection Regulation</p>
              </div>
              <div>
                <h4 className="font-medium">🇺🇸 CCPA (California)</h4>
                <p className="text-sm text-gray-600">California Consumer Privacy Act</p>
              </div>
              <div>
                <h4 className="font-medium">🔒 SOC 2 Type II</h4>
                <p className="text-sm text-gray-600">Security and availability controls</p>
              </div>
              <div>
                <h4 className="font-medium">🏥 HIPAA Compatible</h4>
                <p className="text-sm text-gray-600">Healthcare data protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}