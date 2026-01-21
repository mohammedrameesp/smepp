import Link from 'next/link';
import '../landing.css';

export const metadata = {
  title: 'Privacy Policy | Durj',
  description: 'Learn how Durj collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      {/* Navigation */}
      <nav className="nav">
        <div className="container">
          <div className="nav-inner">
            <Link href="/" className="logo">
              <img src="/sme-wordmark-transparent.png" alt="Durj" className="h-8 w-auto" />
            </Link>
            <ul className="nav-links">
              <li><Link href="/#features">Features</Link></li>
              <li><Link href="/#domains">Modules</Link></li>
              <li><Link href="/#security">Security</Link></li>
              <li><Link href="/#pricing">Pricing</Link></li>
            </ul>
            <div className="nav-cta">
              <Link href="/login" className="btn btn-secondary">Log In</Link>
              <Link href="/get-started" className="btn btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="legal-content">
        <div className="container" style={{ maxWidth: '800px' }}>
          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: January 21, 2025</p>

          <p>
            At Durj (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our business operations platform.
          </p>
          <p>
            This policy applies to all users of the Durj platform, including organization administrators, employees, and any individuals whose data is processed through the platform.
          </p>

          <h2 id="information-we-collect">1. Information We Collect</h2>
          <p>
            We collect various types of information depending on how you interact with our platform. As a business operations platform for HR, payroll, and asset management, we necessarily process sensitive personal and employment data.
          </p>

          <h3>1.1 Account Information</h3>
          <p>When you create an account or are added to an organization, we collect:</p>
          <ul>
            <li>Full name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Job title and role</li>
            <li>Profile photo (optional)</li>
            <li>Authentication credentials (password hash or OAuth tokens)</li>
          </ul>

          <h3>1.2 Identity Documents</h3>
          <p>
            For HR and compliance purposes, organizations may collect the following identity information through our platform:
          </p>
          <ul>
            <li><strong>Qatar ID (QID):</strong> QID number and scanned copy of the ID card (required for WPS compliance)</li>
            <li><strong>Passport:</strong> Passport number, issue date, expiry date, and scanned copy</li>
            <li><strong>Visa Information:</strong> Visa type, visa number, issue date, and expiry date</li>
            <li><strong>Work Permit:</strong> Work permit number, issue date, and expiry date</li>
            <li><strong>Health Card:</strong> Health card expiry date</li>
            <li><strong>Driving License:</strong> License number and expiry date (if applicable to role)</li>
          </ul>
          <p>
            Scanned copies of identity documents are stored securely and access is restricted to authorized organization administrators.
          </p>

          <h3>1.3 Financial and Banking Information</h3>
          <p>
            For payroll processing and salary payments, we collect:
          </p>
          <ul>
            <li><strong>Bank Details:</strong> Bank name, branch name, account number</li>
            <li><strong>IBAN:</strong> International Bank Account Number (required for WPS salary transfers)</li>
            <li><strong>SWIFT Code:</strong> Bank identification code for transfers</li>
            <li><strong>Salary Information:</strong> Basic salary, housing allowance, transport allowance, food allowance, phone allowance, and other allowances</li>
            <li><strong>Loan/Advance Records:</strong> Details of any salary advances or company loans</li>
          </ul>

          <h3>1.4 Personal and Demographic Data</h3>
          <p>Organizations may collect additional personal information:</p>
          <ul>
            <li>Date of birth</li>
            <li>Gender</li>
            <li>Nationality</li>
            <li>Marital status</li>
            <li>Religion (where relevant for leave entitlements)</li>
            <li>Blood type</li>
            <li>Residential address</li>
          </ul>

          <h3>1.5 Emergency Contacts</h3>
          <p>For workplace safety purposes:</p>
          <ul>
            <li>Emergency contact name</li>
            <li>Relationship to employee</li>
            <li>Phone number</li>
          </ul>

          <h3>1.6 Employment Information</h3>
          <p>We process employment-related data including:</p>
          <ul>
            <li>Employee code and badge number</li>
            <li>Department and reporting structure</li>
            <li>Employment type (full-time, part-time, contractor)</li>
            <li>Join date and probation end date</li>
            <li>Contract type and end date</li>
            <li>Leave balances and leave history</li>
            <li>Asset assignments</li>
            <li>Termination date and reason (if applicable)</li>
          </ul>

          <h3>1.7 Education and Qualifications</h3>
          <p>Organizations may store:</p>
          <ul>
            <li>Educational qualifications</li>
            <li>Professional certifications</li>
            <li>Skills and competencies</li>
            <li>Previous work experience</li>
          </ul>

          <h3>1.8 Automatically Collected Data</h3>
          <p>When you use our platform, we automatically collect:</p>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform, and interaction patterns</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and IP address</li>
            <li><strong>Log Data:</strong> Server logs including access times, error logs, and referring URLs</li>
            <li><strong>Activity Logs:</strong> Actions taken within the platform for audit and security purposes</li>
          </ul>

          <h2 id="how-we-use">2. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>

          <h3>Platform Operations</h3>
          <ul>
            <li>Provide, maintain, and improve our platform and services</li>
            <li>Process payroll and generate payslips</li>
            <li>Manage leave requests and balances</li>
            <li>Track assets and equipment assignments</li>
            <li>Generate reports and analytics for organization administrators</li>
          </ul>

          <h3>Communications</h3>
          <ul>
            <li>Send system notifications about leave approvals, asset assignments, and other workflow events</li>
            <li>Send technical notices, updates, security alerts, and administrative messages</li>
            <li>Respond to support requests and inquiries</li>
          </ul>

          <h3>Security and Compliance</h3>
          <ul>
            <li>Verify user identity and prevent unauthorized access</li>
            <li>Detect, investigate, and prevent fraudulent activities</li>
            <li>Maintain audit trails for compliance purposes</li>
            <li>Submit required information to government systems (such as WPS)</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h3>Service Improvement</h3>
          <ul>
            <li>Monitor and analyse trends and usage patterns</li>
            <li>Personalise and improve user experience</li>
            <li>Develop new features and services</li>
          </ul>

          <h2 id="ai-processing">3. AI and Automated Processing</h2>
          <p>
            Durj incorporates artificial intelligence features to enhance the platform experience. It is important that you understand how AI processes your data.
          </p>

          <h3>AI Chat Assistant</h3>
          <p>
            Our AI-powered chat assistant uses <strong>OpenAI&apos;s</strong> language models to help users find information and perform actions within the platform. When you use the AI assistant:
          </p>
          <ul>
            <li>Your queries are sent to OpenAI&apos;s API for processing</li>
            <li>The AI may access employee names, roles, departments, and other organizational data to provide relevant responses</li>
            <li>For administrators, the AI may access salary and financial data when answering payroll-related queries</li>
            <li>Conversation history is stored for context and can be viewed by you</li>
          </ul>

          <h3>Data Retention for AI</h3>
          <ul>
            <li>AI chat conversations are retained for <strong>90 days</strong> by default</li>
            <li>Organization administrators can configure shorter retention periods</li>
            <li>Users can delete their own conversation history at any time</li>
            <li>OpenAI&apos;s data retention policies also apply to data processed through their API</li>
          </ul>

          <h3>Automated Decision-Making</h3>
          <p>
            The platform may use automated processing for certain functions such as leave balance calculations, workflow routing, and document expiry notifications. These automated processes do not make decisions that significantly affect individuals without human oversight.
          </p>

          <h2 id="data-sharing">4. Data Sharing and Disclosure</h2>
          <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
          <ul>
            <li><strong>Within Your Organization:</strong> Your employer/organization administrators have access to your employment data as necessary for business operations</li>
            <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (see Section 5)</li>
            <li><strong>Government Authorities:</strong> When required for statutory reporting such as WPS (see Section 6)</li>
            <li><strong>Legal Requirements:</strong> When required by law, legal process, or governmental request</li>
            <li><strong>Protection of Rights:</strong> To protect our rights, privacy, safety, or property, and that of our users</li>
            <li><strong>Business Transfers:</strong> In connection with any merger, sale, or transfer of business assets</li>
            <li><strong>With Consent:</strong> With your explicit consent for any other purpose</li>
          </ul>

          <h2 id="third-party-services">5. Third-Party Service Providers</h2>
          <p>
            We use the following third-party services to operate our platform. Each service has access only to the data necessary for its function:
          </p>

          <table className="legal-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Purpose</th>
                <th>Data Shared</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Supabase</strong></td>
                <td>Database hosting and file storage</td>
                <td>All platform data, documents, and uploaded files</td>
              </tr>
              <tr>
                <td><strong>Resend</strong></td>
                <td>Transactional email delivery</td>
                <td>Email addresses, email content (notifications, invitations)</td>
              </tr>
              <tr>
                <td><strong>OpenAI</strong></td>
                <td>AI chat assistant</td>
                <td>User queries and relevant organizational data for responses</td>
              </tr>
              <tr>
                <td><strong>Google OAuth</strong></td>
                <td>Social login authentication</td>
                <td>Email, name, profile picture</td>
              </tr>
              <tr>
                <td><strong>Microsoft Azure AD</strong></td>
                <td>Enterprise single sign-on (optional)</td>
                <td>Email, name, job title</td>
              </tr>
              <tr>
                <td><strong>Stripe</strong></td>
                <td>Payment processing (future)</td>
                <td>Billing name, address, payment method</td>
              </tr>
              <tr>
                <td><strong>Sentry</strong></td>
                <td>Error monitoring and debugging</td>
                <td>Error logs, stack traces, anonymized user context</td>
              </tr>
              <tr>
                <td><strong>Upstash Redis</strong></td>
                <td>Rate limiting and caching</td>
                <td>Request metadata, anonymized IP addresses</td>
              </tr>
              <tr>
                <td><strong>WhatsApp/Meta</strong></td>
                <td>Notification delivery (optional)</td>
                <td>Phone numbers, notification content</td>
              </tr>
              <tr>
                <td><strong>QNAS</strong></td>
                <td>Qatar address lookup</td>
                <td>Zone, street, building information</td>
              </tr>
            </tbody>
          </table>
          <p>
            All third-party providers are contractually bound to protect your data and use it only for the specified purposes.
          </p>

          <h2 id="government-reporting">6. Government Reporting (WPS)</h2>
          <p>
            Organizations using Durj for payroll in Qatar are required by law to submit salary information to the <strong>Wage Protection System (WPS)</strong> administered by the Qatar Ministry of Labour.
          </p>

          <h3>Data Submitted to WPS</h3>
          <p>The following employee information is submitted to the Ministry of Labour:</p>
          <ul>
            <li>Employee full name</li>
            <li>Qatar ID (QID) number</li>
            <li>IBAN (bank account for salary transfer)</li>
            <li>Monthly salary amount</li>
            <li>Allowances breakdown</li>
            <li>Working days</li>
          </ul>

          <h3>Legal Basis</h3>
          <p>
            WPS reporting is a <strong>legal requirement</strong> for all employers in Qatar under Law No. 1 of 2015. This is not optional and cannot be opted out of for employees covered by Qatar labour law.
          </p>
          <p>
            Durj facilitates WPS file generation to help organizations comply with this requirement. The actual submission to the WPS system is performed by the organization through their bank.
          </p>

          <h2 id="data-security">7. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your information:
          </p>
          <ul>
            <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
            <li><strong>Access Controls:</strong> Role-based access controls ensure users only see data they are authorized to access</li>
            <li><strong>Tenant Isolation:</strong> Each organization&apos;s data is logically isolated from other organizations</li>
            <li><strong>Audit Logging:</strong> All significant actions are logged for security and compliance</li>
            <li><strong>Secure Infrastructure:</strong> Hosted on enterprise-grade cloud infrastructure with SOC 2 compliance</li>
            <li><strong>Regular Assessments:</strong> Periodic security reviews and vulnerability assessments</li>
          </ul>
          <p>
            While we strive to protect your personal information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but will notify affected users promptly in the event of a data breach.
          </p>

          <h2 id="your-rights">8. Your Rights</h2>
          <p>You have the following rights regarding your personal information:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete information</li>
            <li><strong>Erasure:</strong> Request deletion of your personal information, subject to legal retention requirements</li>
            <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
            <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
          </ul>
          <p>
            <strong>Important:</strong> Some data may be retained despite deletion requests due to legal requirements (e.g., payroll records for 7 years). Your organization administrator may also have data access and retention policies that apply.
          </p>
          <p>
            To exercise any of these rights, please contact us using the details provided in Section 15, or contact your organization administrator.
          </p>

          <h2 id="data-retention">9. Data Retention</h2>
          <p>
            We retain personal information for different periods depending on the type of data and legal requirements:
          </p>

          <table className="legal-table">
            <thead>
              <tr>
                <th>Data Type</th>
                <th>Retention Period</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Active employee records</td>
                <td>Duration of employment + 7 years</td>
              </tr>
              <tr>
                <td>Payroll and salary records</td>
                <td>7 years (legal requirement)</td>
              </tr>
              <tr>
                <td>Leave records</td>
                <td>7 years</td>
              </tr>
              <tr>
                <td>AI chat conversations</td>
                <td>90 days (configurable)</td>
              </tr>
              <tr>
                <td>Activity and audit logs</td>
                <td>Indefinite (for security and compliance)</td>
              </tr>
              <tr>
                <td>Deleted user accounts</td>
                <td>7 days soft-delete, then permanent deletion</td>
              </tr>
              <tr>
                <td>Identity documents</td>
                <td>Document validity period + 3 years</td>
              </tr>
              <tr>
                <td>Organization data (after subscription ends)</td>
                <td>90 days for reactivation, then deleted</td>
              </tr>
            </tbody>
          </table>
          <p>
            Organizations may configure shorter retention periods for certain data types where legally permitted.
          </p>

          <h2 id="international-transfers">10. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than Qatar. Our primary infrastructure is hosted in regions that may include:
          </p>
          <ul>
            <li>AWS/Supabase data centres (various global locations)</li>
            <li>OpenAI servers (United States)</li>
            <li>Other service provider locations as listed in Section 5</li>
          </ul>
          <p>
            We ensure appropriate safeguards are in place to protect your information:
          </p>
          <ul>
            <li>Standard contractual clauses with service providers</li>
            <li>Data processing agreements that meet international standards</li>
            <li>Selection of providers with appropriate security certifications</li>
          </ul>

          <h2 id="qatar-data-protection">11. Qatar Data Protection</h2>
          <p>
            Durj is designed for businesses operating in Qatar and the GCC region. We are committed to compliance with applicable data protection regulations including:
          </p>
          <ul>
            <li><strong>Qatar Personal Data Protection Law (PDPL):</strong> We process personal data in accordance with Qatar&apos;s data protection framework</li>
            <li><strong>Qatar Labour Law:</strong> Employment data processing complies with labour law requirements</li>
            <li><strong>GCC Regional Standards:</strong> We follow regional best practices for data protection</li>
          </ul>
          <p>
            For users in other jurisdictions, additional rights may apply under local laws (such as GDPR for EU residents). Please contact us if you have questions about jurisdiction-specific rights.
          </p>

          <h2 id="childrens-privacy">12. Children&apos;s Privacy</h2>
          <p>
            Durj is a business operations platform intended for use by adults in professional contexts. We do not knowingly collect personal information from children under 18 years of age.
          </p>
          <p>
            If we become aware that we have collected personal information from a child, we will take steps to delete that information promptly. If you believe a child has provided us with personal information, please contact us.
          </p>

          <h2 id="cookies">13. Cookies</h2>
          <p>
            We use cookies and similar tracking technologies to enhance your experience. These include:
          </p>
          <ul>
            <li><strong>Essential Cookies:</strong> Required for authentication and core platform functionality</li>
            <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the platform</li>
          </ul>
          <p>
            For detailed information about our cookie usage, please see our <Link href="/cookies">Cookie Policy</Link>.
          </p>

          <h2 id="changes">14. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by:
          </p>
          <ul>
            <li>Posting the new Privacy Policy on this page</li>
            <li>Updating the &quot;Last updated&quot; date at the top</li>
            <li>Sending an email notification for significant changes</li>
            <li>Displaying an in-app notification</li>
          </ul>
          <p>
            We encourage you to review this Privacy Policy periodically for any changes. Continued use of the platform after changes constitutes acceptance of the updated policy.
          </p>

          <h2 id="contact">15. Contact Us</h2>
          <div className="contact-box">
            <h3>Questions about this Privacy Policy?</h3>
            <p>
              If you have any questions about this Privacy Policy, our data practices, or wish to exercise your data protection rights, please contact us:
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:privacy@durj.com">privacy@durj.com</a><br />
              <strong>General Inquiries:</strong> <a href="mailto:hello@durj.com">hello@durj.com</a><br />
              <strong>Address:</strong> Doha, Qatar
            </p>
            <p>
              For organization-specific data inquiries, please first contact your organization administrator, who can assist with data access and correction requests.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo" style={{ color: 'white' }}>
                <img src="/sme-wordmark-white.png" alt="Durj" className="h-8 w-auto" />
              </Link>
              <p>
                Operations, Upgraded. The all-in-one business operations platform for Qatar SMEs.
              </p>
            </div>
            <div>
              <div className="footer-title">Product</div>
              <ul className="footer-links">
                <li><Link href="/#features">Features</Link></li>
                <li><Link href="/#pricing">Pricing</Link></li>
                <li><Link href="/#security">Security</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-title">Legal</div>
              <ul className="footer-links">
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/cookies">Cookie Policy</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-title">Contact</div>
              <ul className="footer-links">
                <li><a href="mailto:hello@durj.com">hello@durj.com</a></li>
                <li><a href="mailto:support@durj.com">support@durj.com</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copyright">
              &copy; {new Date().getFullYear()} Durj. All rights reserved. Built with care in Qatar.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
