import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Processing Agreement (DPA) - AI Accessibility Scanner',
  description: 'Data Processing Agreement for Enterprise customers. GDPR-compliant terms for processing personal data with AI Accessibility Scanner.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function DataProcessingAgreement() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Data Processing Agreement (DPA)
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-purple-50 border-l-4 border-purple-400 p-6 mb-8">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-purple-700">
                  <strong>Enterprise Compliance:</strong> This DPA ensures GDPR compliance for Enterprise customers. 
                  It defines how we process personal data as your processor, with strict security and confidentiality measures.
                </p>
              </div>
            </div>
          </div>

          <h2>1. Parties and Definitions</h2>
          
          <h3>1.1 Parties</h3>
          <ul>
            <li><strong>Data Controller ("Customer"):</strong> The entity that has executed an Enterprise Agreement with AI Accessibility Scanner</li>
            <li><strong>Data Processor ("Company"):</strong> AI Accessibility Scanner, Inc.</li>
          </ul>

          <h3>1.2 Definitions</h3>
          <p>Terms used in this DPA have the meanings defined in:</p>
          <ul>
            <li>General Data Protection Regulation (GDPR) (EU) 2016/679</li>
            <li>California Consumer Privacy Act (CCPA)</li>
            <li>UK Data Protection Act 2018</li>
            <li>The applicable Enterprise Service Agreement</li>
          </ul>

          <h2>2. Scope and Application</h2>
          
          <h3>2.1 Scope</h3>
          <p>This DPA applies to the processing of Personal Data by Company on behalf of Customer in connection with the AI Accessibility Scanner service.</p>

          <h3>2.2 Data Processing Activities</h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Processing Activity</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Personal Data Categories</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Data Subjects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="text-sm font-medium text-gray-900">Account Management</td>
                  <td className="text-sm text-gray-500">Email, Name, Job Title</td>
                  <td className="text-sm text-gray-500">Customer Employees</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">Accessibility Scanning</td>
                  <td className="text-sm text-gray-500">Website Content, User Interactions</td>
                  <td className="text-sm text-gray-500">End Users</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">Support Services</td>
                  <td className="text-sm text-gray-500">Contact Information, Support Tickets</td>
                  <td className="text-sm text-gray-500">Customer Personnel</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">Billing</td>
                  <td className="text-sm text-gray-500">Payment Information, Usage Data</td>
                  <td className="text-sm text-gray-500">Billing Contacts</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>3. Data Processing Principles</h2>
          
          <h3>3.1 Lawfulness and Purpose Limitation</h3>
          <ul>
            <li>Company processes Personal Data only for the purposes specified in this DPA</li>
            <li>Processing is limited to what is necessary for providing the Service</li>
            <li>No processing for Company's own commercial purposes without consent</li>
          </ul>

          <h3>3.2 Data Minimization</h3>
          <ul>
            <li>Only necessary Personal Data is collected and processed</li>
            <li>Source code is processed in ephemeral containers and not stored</li>
            <li>Personal Data is anonymized or pseudonymized where possible</li>
          </ul>

          <h3>3.3 Accuracy and Storage Limitation</h3>
          <ul>
            <li>Personal Data is kept accurate and up to date</li>
            <li>Data retention periods are clearly defined (see Section 6)</li>
            <li>Data is deleted or anonymized when no longer needed</li>
          </ul>

          <h2>4. Security Measures</h2>
          
          <h3>4.1 Technical Safeguards</h3>
          <div className="bg-blue-50 p-6 rounded-lg">
            <h4 className="font-semibold mb-4">SOC 2 Type II Certified Controls:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium">Encryption</h5>
                <ul className="text-sm mt-2">
                  <li>TLS 1.3 for data in transit</li>
                  <li>AES-256 for data at rest</li>
                  <li>End-to-end encryption for sensitive data</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium">Access Controls</h5>
                <ul className="text-sm mt-2">
                  <li>Multi-factor authentication</li>
                  <li>Role-based access control</li>
                  <li>Regular access reviews</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium">Infrastructure</h5>
                <ul className="text-sm mt-2">
                  <li>Isolated processing environments</li>
                  <li>Container orchestration</li>
                  <li>Network segmentation</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium">Monitoring</h5>
                <ul className="text-sm mt-2">
                  <li>24/7 security monitoring</li>
                  <li>Intrusion detection systems</li>
                  <li>Audit logging</li>
                </ul>
              </div>
            </div>
          </div>

          <h3>4.2 Organizational Measures</h3>
          <ul>
            <li>Employee background checks and confidentiality agreements</li>
            <li>Regular security training and awareness programs</li>
            <li>Incident response and breach notification procedures</li>
            <li>Vendor security assessments</li>
          </ul>

          <h2>5. Sub-processing and International Transfers</h2>
          
          <h3>5.1 Authorized Sub-processors</h3>
          <p>Company may engage the following sub-processors:</p>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Sub-processor</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Safeguards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="text-sm font-medium text-gray-900">Amazon Web Services</td>
                  <td className="text-sm text-gray-500">Cloud Infrastructure</td>
                  <td className="text-sm text-gray-500">EU, US</td>
                  <td className="text-sm text-gray-500">Standard Contractual Clauses</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">Stripe</td>
                  <td className="text-sm text-gray-500">Payment Processing</td>
                  <td className="text-sm text-gray-500">US, EU</td>
                  <td className="text-sm text-gray-500">Adequacy Decision</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">Supabase</td>
                  <td className="text-sm text-gray-500">Database Services</td>
                  <td className="text-sm text-gray-500">EU, US</td>
                  <td className="text-sm text-gray-500">Standard Contractual Clauses</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>5.2 International Transfers</h3>
          <ul>
            <li>Transfers to third countries are protected by appropriate safeguards</li>
            <li>Standard Contractual Clauses (SCCs) for EU transfers</li>
            <li>Adequacy decisions where available</li>
            <li>Customer notification of new international transfers</li>
          </ul>

          <h2>6. Data Subject Rights</h2>
          
          <h3>6.1 Rights Support</h3>
          <p>Company will assist Customer in responding to Data Subject requests:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Access & Portability</h4>
              <ul className="text-sm">
                <li>Provide data extracts within 72 hours</li>
                <li>Support standard export formats</li>
                <li>Assist with data mapping</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Rectification & Erasure</h4>
              <ul className="text-sm">
                <li>Update incorrect data within 24 hours</li>
                <li>Delete data upon verified request</li>
                <li>Confirm completion to Customer</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Restriction & Objection</h4>
              <ul className="text-sm">
                <li>Temporarily restrict processing</li>
                <li>Mark contested data</li>
                <li>Implement processing limitations</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Response Timeline</h4>
              <ul className="text-sm">
                <li>Acknowledge within 24 hours</li>
                <li>Complete simple requests in 72 hours</li>
                <li>Complex requests within 30 days</li>
              </ul>
            </div>
          </div>

          <h2>7. Data Retention and Deletion</h2>
          
          <h3>7.1 Retention Periods</h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Data Type</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Retention Period</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase">Deletion Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="text-sm font-medium text-gray-900">Source Code</td>
                  <td className="text-sm text-gray-500">Never stored (ephemeral)</td>
                  <td className="text-sm text-gray-500">Container destruction</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">Scan Results</td>
                  <td className="text-sm text-gray-500">90 days</td>
                  <td className="text-sm text-gray-500">Secure deletion</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">Account Data</td>
                  <td className="text-sm text-gray-500">Until termination + 30 days</td>
                  <td className="text-sm text-gray-500">Secure deletion</td>
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-900">Audit Logs</td>
                  <td className="text-sm text-gray-500">7 years (legal requirement)</td>
                  <td className="text-sm text-gray-500">Secure deletion</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>7.2 Return and Deletion</h3>
          <p>Upon termination of the service:</p>
          <ul>
            <li>Customer data export provided within 30 days</li>
            <li>Secure deletion completed within 90 days</li>
            <li>Deletion certificate provided to Customer</li>
            <li>Sub-processors instructed to delete data</li>
          </ul>

          <h2>8. Incident Response and Breach Notification</h2>
          
          <h3>8.1 Incident Detection</h3>
          <ul>
            <li>24/7 security monitoring and alerting</li>
            <li>Automated threat detection systems</li>
            <li>Regular vulnerability assessments</li>
            <li>Employee incident reporting channels</li>
          </ul>

          <h3>8.2 Breach Notification Timeline</h3>
          <div className="bg-red-50 p-6 rounded-lg">
            <h4 className="font-semibold mb-4">Required Notifications:</h4>
            <ul>
              <li><strong>Immediate:</strong> Initial notification to Customer security team</li>
              <li><strong>Within 24 hours:</strong> Preliminary incident report</li>
              <li><strong>Within 72 hours:</strong> Detailed incident report for regulatory filing</li>
              <li><strong>Ongoing:</strong> Regular updates until resolution</li>
            </ul>
          </div>

          <h2>9. Audits and Compliance</h2>
          
          <h3>9.1 Audit Rights</h3>
          <ul>
            <li>Customer may audit Company's compliance annually</li>
            <li>SOC 2 Type II reports provided annually</li>
            <li>ISO 27001 certification maintained</li>
            <li>Third-party security assessments available</li>
          </ul>

          <h3>9.2 Compliance Documentation</h3>
          <ul>
            <li>Data processing records maintained</li>
            <li>Security control evidence available</li>
            <li>Training records for personnel</li>
            <li>Vendor assessment documentation</li>
          </ul>

          <h2>10. Liability and Indemnification</h2>
          
          <h3>10.1 Data Protection Liability</h3>
          <ul>
            <li>Company liable for damages caused by non-compliance</li>
            <li>Liability limited to demonstrable damages</li>
            <li>Insurance coverage for data protection claims</li>
          </ul>

          <h3>10.2 Regulatory Fines</h3>
          <ul>
            <li>Company responsible for fines due to its processing failures</li>
            <li>Customer responsible for fines due to its instruction or data</li>
            <li>Joint liability allocated based on responsibility</li>
          </ul>

          <h2>11. Term and Termination</h2>
          
          <h3>11.1 Term</h3>
          <p>This DPA remains in effect for the duration of the Enterprise Service Agreement.</p>

          <h3>11.2 Termination</h3>
          <ul>
            <li>Either party may terminate for material breach</li>
            <li>30 days written notice required</li>
            <li>Data return and deletion obligations survive termination</li>
          </ul>

          <h2>12. Contact Information</h2>
          
          <h3>12.1 Data Protection Contacts</h3>
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Data Protection Officer</h4>
                <p className="text-sm">dpo@accessibility-scanner.com</p>
                <p className="text-sm">+1 (555) 123-4567</p>
              </div>
              <div>
                <h4 className="font-semibold">Security Team</h4>
                <p className="text-sm">security@accessibility-scanner.com</p>
                <p className="text-sm">24/7 incident hotline</p>
              </div>
              <div>
                <h4 className="font-semibold">Legal Department</h4>
                <p className="text-sm">legal@accessibility-scanner.com</p>
                <p className="text-sm">Contract and compliance matters</p>
              </div>
              <div>
                <h4 className="font-semibold">Privacy Requests</h4>
                <p className="text-sm">privacy@accessibility-scanner.com</p>
                <p className="text-sm">Data subject rights and requests</p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-purple-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Enterprise Support</h3>
            <p className="text-sm text-gray-700 mb-4">
              This DPA is part of your Enterprise Agreement. For questions about compliance, 
              data processing, or to exercise data protection rights, contact our dedicated 
              Data Protection Officer.
            </p>
            <button className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              Contact Data Protection Officer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}