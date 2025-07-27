import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy - AI Accessibility Scanner',
  description: 'Cookie Policy for AI Accessibility Scanner. Learn about how we use cookies and tracking technologies to improve your experience.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Cookie Policy
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-orange-50 border-l-4 border-orange-400 p-6 mb-8">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-orange-700">
                  <strong>Cookie Summary:</strong> We use essential cookies for security and functionality, 
                  plus optional analytics cookies to improve our service. You can control your preferences below.
                </p>
              </div>
            </div>
          </div>

          <h2>1. What Are Cookies?</h2>
          <p>Cookies are small text files stored on your device when you visit our website. They help us provide a better user experience by remembering your preferences and analyzing how you use our service.</p>

          <h2>2. How We Use Cookies</h2>
          
          <h3>2.1 Essential Cookies (Always Active)</h3>
          <p>These cookies are necessary for the website to function and cannot be disabled:</p>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Cookie Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="text-sm font-medium text-gray-900">auth_token</td>
                  <td className="text-sm text-gray-500">User authentication and session management</td>
                  <td className="text-sm text-gray-500">30 days</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">csrf_token</td>
                  <td className="text-sm text-gray-500">Cross-site request forgery protection</td>
                  <td className="text-sm text-gray-500">Session</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">session_id</td>
                  <td className="text-sm text-gray-500">Session state and security</td>
                  <td className="text-sm text-gray-500">Session</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">preferences</td>
                  <td className="text-sm text-gray-500">User interface preferences</td>
                  <td className="text-sm text-gray-500">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2.2 Analytics Cookies (Optional)</h3>
          <p>These cookies help us understand how visitors interact with our website:</p>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Cookie Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="text-sm font-medium text-gray-900">_ga</td>
                  <td className="text-sm text-gray-500">Google Analytics - distinguishes users</td>
                  <td className="text-sm text-gray-500">2 years</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">_ga_*</td>
                  <td className="text-sm text-gray-500">Google Analytics - session state</td>
                  <td className="text-sm text-gray-500">2 years</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">_gid</td>
                  <td className="text-sm text-gray-500">Google Analytics - distinguishes users</td>
                  <td className="text-sm text-gray-500">24 hours</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">_gat</td>
                  <td className="text-sm text-gray-500">Google Analytics - throttle request rate</td>
                  <td className="text-sm text-gray-500">1 minute</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>2.3 Marketing Cookies (Optional)</h3>
          <p>These cookies track your visit across websites to show relevant ads:</p>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Cookie Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="text-sm font-medium text-gray-900">_fbp</td>
                  <td className="text-sm text-gray-500">Facebook Pixel - conversion tracking</td>
                  <td className="text-sm text-gray-500">3 months</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">_fbc</td>
                  <td className="text-sm text-gray-500">Facebook Pixel - click tracking</td>
                  <td className="text-sm text-gray-500">3 months</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">li_fat_id</td>
                  <td className="text-sm text-gray-500">LinkedIn Insight Tag</td>
                  <td className="text-sm text-gray-500">30 days</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>3. Third-Party Cookies</h2>
          
          <h3>3.1 Service Providers</h3>
          <p>We use trusted third-party services that may set their own cookies:</p>
          
          <ul>
            <li><strong>Stripe:</strong> Payment processing and fraud prevention</li>
            <li><strong>Google Analytics:</strong> Website analytics and performance monitoring</li>
            <li><strong>Sentry:</strong> Error tracking and performance monitoring</li>
            <li><strong>Intercom:</strong> Customer support chat (if enabled)</li>
          </ul>

          <h3>3.2 Social Media</h3>
          <p>When you interact with social media features on our site, those platforms may set cookies:</p>
          <ul>
            <li>GitHub (for OAuth authentication)</li>
            <li>Google (for OAuth authentication)</li>
            <li>LinkedIn (for sharing and insights)</li>
            <li>Twitter (for sharing)</li>
          </ul>

          <h2>4. Managing Your Cookie Preferences</h2>
          
          <h3>4.1 Cookie Banner</h3>
          <p>When you first visit our website, you'll see a cookie banner allowing you to:</p>
          <ul>
            <li>Accept all cookies</li>
            <li>Accept only essential cookies</li>
            <li>Customize your preferences</li>
          </ul>

          <h3>4.2 Browser Settings</h3>
          <p>You can control cookies through your browser settings:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Chrome</h4>
              <p className="text-sm">Settings → Privacy and Security → Cookies and other site data</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Firefox</h4>
              <p className="text-sm">Settings → Privacy & Security → Cookies and Site Data</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Safari</h4>
              <p className="text-sm">Preferences → Privacy → Cookies and website data</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Edge</h4>
              <p className="text-sm">Settings → Cookies and site permissions → Cookies and site data</p>
            </div>
          </div>

          <h3>4.3 Do Not Track</h3>
          <p>We respect Do Not Track (DNT) signals. When DNT is enabled in your browser:</p>
          <ul>
            <li>We disable non-essential tracking cookies</li>
            <li>Analytics are anonymized further</li>
            <li>Marketing pixels are not loaded</li>
          </ul>

          <h2>5. Impact of Disabling Cookies</h2>
          
          <h3>5.1 Essential Cookies Disabled</h3>
          <p>If you disable essential cookies, you may experience:</p>
          <ul>
            <li>Inability to log in or maintain sessions</li>
            <li>Security vulnerabilities</li>
            <li>Loss of preferences and settings</li>
            <li>Reduced functionality</li>
          </ul>

          <h3>5.2 Analytics Cookies Disabled</h3>
          <ul>
            <li>No impact on core functionality</li>
            <li>We cannot improve user experience based on usage patterns</li>
            <li>Performance issues may go undetected</li>
          </ul>

          <h3>5.3 Marketing Cookies Disabled</h3>
          <ul>
            <li>No impact on core functionality</li>
            <li>Less relevant advertising elsewhere</li>
            <li>Reduced conversion tracking accuracy</li>
          </ul>

          <h2>6. Data Protection and Privacy</h2>
          
          <h3>6.1 Data Minimization</h3>
          <ul>
            <li>We only collect cookies necessary for our service</li>
            <li>Cookie data is anonymized when possible</li>
            <li>We regularly review and clean up unused cookies</li>
          </ul>

          <h3>6.2 Security</h3>
          <ul>
            <li>Cookies are secured with HTTPs encryption</li>
            <li>Sensitive cookies are marked as HttpOnly and Secure</li>
            <li>Cross-site scripting protections are in place</li>
          </ul>

          <h2>7. Cookie Updates and Changes</h2>
          <p>We may update this Cookie Policy to reflect:</p>
          <ul>
            <li>Changes in technology or legal requirements</li>
            <li>New features or services</li>
            <li>Updated third-party integrations</li>
          </ul>
          <p>We will notify you of significant changes via email or website banner.</p>

          <h2>8. Contact Us</h2>
          <p>For questions about our use of cookies:</p>
          <ul>
            <li><strong>Email:</strong> privacy@accessibility-scanner.com</li>
            <li><strong>Data Protection Officer:</strong> dpo@accessibility-scanner.com</li>
            <li><strong>Support:</strong> support@accessibility-scanner.com</li>
          </ul>

          <div className="mt-12 p-6 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Cookie Consent Management</h3>
            <p className="text-sm text-gray-700 mb-4">
              You can update your cookie preferences at any time by clicking the button below:
            </p>
            <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Manage Cookie Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}