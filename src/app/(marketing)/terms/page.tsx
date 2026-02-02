/**
 * @module app/(marketing)/terms/page
 * @description Terms of Service page for the Durj marketing site.
 * Comprehensive legal terms covering account registration, organization accounts,
 * subscription tiers, data processing responsibilities, AI features, payroll,
 * third-party services, acceptable use, intellectual property, liability,
 * termination, and governing law (Qatar jurisdiction).
 * Includes navigation header and footer consistent with other legal pages.
 */

import Link from 'next/link';
import '../landing.css';

export const metadata = {
  title: 'Terms of Service | Durj',
  description: 'Read the terms and conditions governing your use of the Durj platform.',
};

export default function TermsPage() {
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
          <h1>Terms of Service</h1>
          <p className="last-updated">Last updated: January 21, 2025</p>

          <p>
            Welcome to Durj. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Durj platform, including our website, applications, and services (collectively, the &quot;Service&quot;). By accessing or using the Service, you agree to be bound by these Terms.
          </p>

          <h2 id="acceptance">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using the Service, you represent that you are at least 18 years of age and have the legal authority to enter into these Terms. If you are using the Service on behalf of an organisation, you represent that you have the authority to bind that organisation to these Terms.
          </p>
          <p>
            If you do not agree to these Terms, you may not access or use the Service.
          </p>
          <p>
            These Terms apply to all users of the Service, including Organisation Owners, Administrators, Managers, Members, and Employee Users (each as defined below).
          </p>

          <h2 id="definitions">2. Definitions</h2>
          <p>
            The following definitions apply throughout these Terms:
          </p>
          <ul>
            <li><strong>&quot;Organisation&quot;</strong> means a business entity (tenant) that uses the Durj platform. Each Organisation has its own isolated data environment.</li>
            <li><strong>&quot;Organisation Owner&quot;</strong> means the person who created the Organisation account and has full administrative control over it.</li>
            <li><strong>&quot;Administrator&quot;</strong> means a user with administrative privileges within an Organisation, including the ability to manage users, settings, and modules.</li>
            <li><strong>&quot;Manager&quot;</strong> means a user with elevated privileges to approve requests and manage team members within their scope.</li>
            <li><strong>&quot;Member&quot;</strong> means a standard user with access to Organisation features based on their assigned permissions.</li>
            <li><strong>&quot;Employee User&quot;</strong> means an employee added to the Organisation by their employer to access employee self-service features.</li>
            <li><strong>&quot;Service&quot;</strong> means the Durj platform and all its features, modules, APIs, and related services.</li>
            <li><strong>&quot;Subscription Tier&quot;</strong> means the service level (FREE, STARTER, PROFESSIONAL, or ENTERPRISE) that determines available features and limits.</li>
            <li><strong>&quot;Module&quot;</strong> means a feature set within the Service (e.g., Assets, Employees, Leave, Payroll) that may be enabled or disabled based on Subscription Tier.</li>
            <li><strong>&quot;Content&quot;</strong> means all data, text, files, documents, images, and other materials uploaded to or created within the Service.</li>
          </ul>

          <h2 id="description">3. Description of Service</h2>
          <p>
            Durj is a multi-tenant business operations platform designed for small and medium businesses in Qatar and the GCC region. The Service provides tools for:
          </p>
          <ul>
            <li><strong>Operations Management:</strong> Asset tracking, subscription management, and supplier relationship management</li>
            <li><strong>Human Resources:</strong> Employee records, leave management, and employee self-service</li>
            <li><strong>Payroll:</strong> Salary calculations, payslip generation, and WPS file creation</li>
            <li><strong>Projects:</strong> Task management, purchase requests, and workflow automation</li>
            <li><strong>AI Assistance:</strong> AI-powered chat assistant for querying organisational data</li>
          </ul>
          <p>
            The Service is provided on a subscription basis with different tiers offering varying features, modules, and usage limits.
          </p>
          <p>
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time. We will provide reasonable notice for material changes that affect your use of the Service. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
          </p>

          <h2 id="accounts">4. User Accounts and Organizations</h2>

          <h3>4.1 Account Registration</h3>
          <p>To use the Service, you must create an account by providing accurate and complete information. You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorised use of your account</li>
            <li>Keeping your account information up to date</li>
          </ul>
          <p>
            We support multiple authentication methods including email/password, Google OAuth, and Microsoft Azure AD. You may use any supported method but are responsible for the security of your chosen authentication.
          </p>

          <h3>4.2 Organisation Accounts</h3>
          <p>
            When you create an Organisation on Durj, you establish a separate tenant environment with isolated data storage. Each Organisation has its own subdomain (e.g., yourcompany.durj.com) and user management.
          </p>
          <p>
            Organisations are independent entities, and data is not shared between Organisations unless explicitly configured (e.g., through API integrations you establish).
          </p>

          <h3>4.3 Organisation Owner Responsibilities</h3>
          <p>
            As an Organisation Owner or Administrator, you are responsible for:
          </p>
          <ul>
            <li><strong>User Management:</strong> Adding, removing, and managing user access and roles within your Organisation</li>
            <li><strong>Consent:</strong> Ensuring all users you add to the Organisation have consented to the use of the Service and understand how their data will be processed</li>
            <li><strong>Legal Compliance:</strong> Complying with all applicable employment, labour, and data protection laws in your jurisdiction</li>
            <li><strong>Data Accuracy:</strong> Ensuring the accuracy of employee and organisational data entered into the Service</li>
            <li><strong>Access Control:</strong> Appropriately restricting access to sensitive features such as payroll based on user roles</li>
            <li><strong>Employee Notifications:</strong> Informing employees about the platform&apos;s use and their rights regarding their personal data</li>
            <li><strong>Terms Compliance:</strong> Ensuring all users within your Organisation comply with these Terms</li>
          </ul>

          <h3>4.4 Employee Users</h3>
          <p>
            Employee Users are added to the Service by their Organisation. If you are an Employee User:
          </p>
          <ul>
            <li>Your account and access is controlled by your Organisation</li>
            <li>Your Organisation determines what data about you is stored in the Service</li>
            <li>You should review our <Link href="/privacy">Privacy Policy</Link> to understand how your data is processed</li>
            <li>Your Organisation, not Durj, is your employer of record</li>
            <li>Any questions about your employment or data should first be directed to your Organisation</li>
          </ul>
          <p>
            Employee Users have access to self-service features including viewing their profile, submitting leave requests, viewing payslips, and managing assigned assets.
          </p>

          <h2 id="subscription">5. Subscription and Payment</h2>

          <h3>5.1 Subscription Tiers</h3>
          <p>
            The Service is available in the following subscription tiers:
          </p>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Included Modules</th>
                <th>Limits</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>FREE</strong></td>
                <td>Assets, Subscriptions, Suppliers</td>
                <td>5 users, 50 assets</td>
              </tr>
              <tr>
                <td><strong>STARTER</strong></td>
                <td>+ Employees, Leave Management</td>
                <td>15 users, 200 assets</td>
              </tr>
              <tr>
                <td><strong>PROFESSIONAL</strong></td>
                <td>All modules including Payroll, Projects</td>
                <td>50 users, 1,000 assets</td>
              </tr>
              <tr>
                <td><strong>ENTERPRISE</strong></td>
                <td>All modules + Priority Support</td>
                <td>Unlimited users and assets</td>
              </tr>
            </tbody>
          </table>
          <p>
            Current pricing and detailed feature comparisons are available on our website. Prices are subject to change with notice.
          </p>

          <h3>5.2 Billing</h3>
          <ul>
            <li>Subscriptions are billed in advance on a monthly or annual basis</li>
            <li>All fees are non-refundable except as required by law or otherwise specified</li>
            <li>You authorise us to charge your payment method for all applicable fees</li>
            <li>Failed payments may result in suspension of your account until payment is resolved</li>
            <li>We will provide notice of any price increases before they take effect on your next billing cycle</li>
          </ul>

          <h3>5.3 Free Tier</h3>
          <p>
            The FREE tier is available indefinitely for Organisations that stay within its limits. Free tier Organisations have access to core features but with reduced limits and without certain modules.
          </p>
          <p>
            We reserve the right to modify the features and limits of the FREE tier with reasonable notice.
          </p>

          <h3>5.4 Upgrades and Downgrades</h3>
          <ul>
            <li><strong>Upgrades:</strong> Take effect immediately. You will be billed the prorated difference for the remainder of your billing period.</li>
            <li><strong>Downgrades:</strong> Take effect at the end of your current billing period. If your current usage exceeds the limits of your new tier, you may need to reduce usage before the downgrade takes effect.</li>
            <li><strong>Exceeding Limits:</strong> Data exceeding your tier&apos;s limits may become read-only or inaccessible until you upgrade or reduce usage.</li>
          </ul>

          <h3>5.5 Beta Features</h3>
          <p>
            We may offer beta or experimental features for testing. Beta features are provided &quot;as is&quot; without warranty, may be modified or discontinued at any time, and may have additional terms that apply to their use.
          </p>

          <h2 id="data-processing">6. Data Processing and Responsibilities</h2>

          <h3>6.1 Organisation as Data Controller</h3>
          <p>
            For the purposes of data protection law, your Organisation is the &quot;data controller&quot; for employee and organisational data processed through the Service. This means your Organisation:
          </p>
          <ul>
            <li>Determines the purposes and means of processing personal data</li>
            <li>Is responsible for establishing a lawful basis for processing (e.g., employment contract, consent, legitimate interest)</li>
            <li>Must comply with applicable data protection laws including Qatar&apos;s Personal Data Protection Law (PDPL)</li>
            <li>Is responsible for responding to data subject requests from employees</li>
          </ul>

          <h3>6.2 Durj as Data Processor</h3>
          <p>
            Durj acts as a &quot;data processor&quot; on behalf of Organisations. We:
          </p>
          <ul>
            <li>Process data only according to your instructions and for the purposes of providing the Service</li>
            <li>Maintain technical and organisational security measures to protect your data</li>
            <li>Ensure data isolation between Organisations through our multi-tenant architecture</li>
            <li>Will notify you of data breaches affecting your Organisation&apos;s data</li>
            <li>Assist you in meeting your data protection obligations where reasonably required</li>
          </ul>
          <p>
            For details on how we process data, please see our <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <h3>6.3 Employee Data Consent</h3>
          <p>
            As an Organisation using Durj for employee management, you are responsible for:
          </p>
          <ul>
            <li>Obtaining appropriate consent from employees before entering their personal data into the Service</li>
            <li>Informing employees that their data will be processed through the Durj platform</li>
            <li>Providing employees with access to our Privacy Policy</li>
            <li>Responding to employee requests regarding access, correction, or deletion of their personal data</li>
            <li>Ensuring that sensitive data (such as religion, for religious holiday leave) is only collected with explicit consent where required by law</li>
          </ul>

          <h2 id="ai-features">7. AI Features</h2>

          <h3>7.1 AI Chat Assistant</h3>
          <p>
            Durj includes an AI-powered chat assistant designed to help users find information and perform actions within the platform. The AI assistant:
          </p>
          <ul>
            <li>Is powered by third-party AI technology (OpenAI)</li>
            <li>Can answer questions about your Organisation&apos;s data, including employees, assets, leave balances, and payroll information</li>
            <li>May access and summarise data based on your user permissions</li>
            <li>Maintains conversation history for context during your session</li>
          </ul>

          <h3>7.2 AI Limitations</h3>
          <p>
            <strong>Important:</strong> The AI assistant has limitations that you must understand:
          </p>
          <ul>
            <li><strong>Not Legal or Financial Advice:</strong> AI responses are informational only and do not constitute legal, financial, tax, or professional HR advice</li>
            <li><strong>Accuracy Not Guaranteed:</strong> The AI may produce incorrect, incomplete, or outdated information. Always verify critical information through official platform features or professional advisors</li>
            <li><strong>Not a Professional Substitute:</strong> The AI is not a substitute for qualified accountants, lawyers, HR professionals, or other specialists</li>
            <li><strong>Hallucinations:</strong> AI systems can occasionally generate plausible-sounding but incorrect information. Exercise appropriate skepticism</li>
          </ul>
          <p>
            You assume full responsibility for any decisions or actions taken based on AI responses.
          </p>

          <h3>7.3 AI Data Usage</h3>
          <ul>
            <li>AI queries are processed by OpenAI&apos;s API services</li>
            <li>Your conversation history is retained according to our <Link href="/privacy">Privacy Policy</Link></li>
            <li>Users can view and delete their own AI conversation history</li>
            <li>Organisations can configure AI data retention settings</li>
            <li>AI access respects user permission levels (e.g., non-admin users cannot query salary information through AI)</li>
          </ul>

          <h2 id="payroll">8. Payroll and Financial Features</h2>

          <h3>8.1 Payroll Processing</h3>
          <p>
            The Service includes payroll features that allow Organisations to:
          </p>
          <ul>
            <li>Calculate employee salaries, allowances, and deductions</li>
            <li>Generate payslips and payroll reports</li>
            <li>Track loans, advances, and salary adjustments</li>
            <li>Calculate end-of-service gratuity and leave settlements</li>
          </ul>
          <p>
            <strong>Important:</strong> Durj provides payroll calculation tools but does not transfer funds or execute payments. Your Organisation is responsible for:
          </p>
          <ul>
            <li>Verifying all payroll calculations before processing payments</li>
            <li>Making actual salary payments through your bank or payment provider</li>
            <li>Ensuring timely and accurate payment to employees</li>
          </ul>

          <h3>8.2 WPS Compliance</h3>
          <p>
            For Organisations operating in Qatar, the Service can generate Wage Protection System (WPS) files for submission to the Ministry of Labour.
          </p>
          <ul>
            <li>Durj generates WPS-formatted files based on payroll data you provide</li>
            <li>Your Organisation is solely responsible for submitting WPS files to your bank</li>
            <li>Your Organisation is responsible for compliance with Qatar Labour Law and WPS regulations</li>
            <li>Durj is not liable for WPS submission errors, rejections, or compliance violations</li>
          </ul>

          <h3>8.3 Financial Accuracy Disclaimer</h3>
          <p>
            All financial calculations provided by the Service, including but not limited to:
          </p>
          <ul>
            <li>Salary and allowance calculations</li>
            <li>Leave deductions and encashments</li>
            <li>End-of-service gratuity calculations</li>
            <li>Tax estimates (where applicable)</li>
            <li>Loan and advance tracking</li>
          </ul>
          <p>
            are based on the data and configuration entered by your Organisation. Durj does not warrant the accuracy of these calculations and is not responsible for:
          </p>
          <ul>
            <li>Errors resulting from incorrect data entry</li>
            <li>Calculation discrepancies due to misconfigured settings</li>
            <li>Financial losses arising from reliance on calculated amounts</li>
          </ul>
          <p>
            Your Organisation should verify all financial outputs and consult qualified accountants or payroll professionals as appropriate.
          </p>

          <h2 id="third-party">9. Third-Party Services</h2>
          <p>
            The Service integrates with third-party services to provide its functionality. By using the Service, you acknowledge that your data may be processed by the following providers:
          </p>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Supabase</strong></td>
                <td>Database hosting and file storage</td>
              </tr>
              <tr>
                <td><strong>OpenAI</strong></td>
                <td>AI chat assistant processing</td>
              </tr>
              <tr>
                <td><strong>Resend</strong></td>
                <td>Transactional email delivery</td>
              </tr>
              <tr>
                <td><strong>Google</strong></td>
                <td>OAuth authentication</td>
              </tr>
              <tr>
                <td><strong>Microsoft Azure AD</strong></td>
                <td>Enterprise single sign-on</td>
              </tr>
              <tr>
                <td><strong>Stripe</strong></td>
                <td>Payment processing</td>
              </tr>
            </tbody>
          </table>
          <p>
            Each third-party service is governed by its own terms and privacy policies. For details on data sharing with these services, see our <Link href="/privacy">Privacy Policy</Link>.
          </p>
          <p>
            We are not responsible for the acts or omissions of third-party service providers.
          </p>

          <h2 id="acceptable-use">10. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of any laws</li>
            <li>Upload or transmit viruses, malware, or other malicious code</li>
            <li>Attempt to gain unauthorised access to any part of the Service or other users&apos; data</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Scrape, crawl, or use automated means to access the Service without permission</li>
            <li>Resell, sublicense, or redistribute the Service without authorisation</li>
            <li>Use the Service to store or transmit infringing or illegal content</li>
            <li>Impersonate any person or entity or misrepresent your affiliation</li>
            <li>Harass, abuse, or harm another person through the Service</li>
            <li>Attempt to circumvent usage limits or access modules not included in your subscription tier</li>
            <li>Share your account credentials or allow multiple individuals to use a single user account</li>
            <li>Use the Service in a manner that could damage, disable, or impair the Service</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate these acceptable use policies.
          </p>

          <h2 id="intellectual-property">11. Intellectual Property</h2>

          <h3>Our Rights</h3>
          <p>
            The Service and its original content, features, and functionality are owned by Durj and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. This includes:
          </p>
          <ul>
            <li>The Durj name, logo, and branding</li>
            <li>Platform design, user interface, and user experience</li>
            <li>Software code and algorithms</li>
            <li>Documentation and training materials</li>
          </ul>

          <h3>Your Rights</h3>
          <p>
            You retain ownership of any data and Content you upload to the Service. By using the Service, you grant us a limited licence to use, store, process, and display your Content solely to provide and improve the Service.
          </p>
          <p>
            This licence does not grant us the right to use your Content for purposes unrelated to providing the Service, such as marketing or sale to third parties.
          </p>

          <h3>Feedback</h3>
          <p>
            Any feedback, suggestions, or ideas you provide about the Service may be used by us without any obligation to you. By providing feedback, you grant us a perpetual, irrevocable licence to use that feedback for any purpose.
          </p>

          <h2 id="data-export">12. Data Export and Portability</h2>
          <p>
            Organisations have the right to export their data from the Service:
          </p>
          <ul>
            <li><strong>Export Formats:</strong> Data can be exported in standard formats including CSV, JSON, and PDF</li>
            <li><strong>Export Scope:</strong> Administrators can export employee records, asset inventories, payroll data, leave records, and other organisational data</li>
            <li><strong>Self-Service:</strong> Most exports can be performed directly through the platform&apos;s reporting features</li>
            <li><strong>Assistance:</strong> For large or complex data exports, contact our support team</li>
          </ul>

          <h3>Data Retention After Termination</h3>
          <p>
            After subscription termination or account closure:
          </p>
          <ul>
            <li>Your data will be retained for <strong>90 days</strong> to allow for data export or account reactivation</li>
            <li>After the retention period, data will be permanently and irreversibly deleted</li>
            <li>We recommend exporting your data before cancelling your subscription</li>
            <li>Some data may be retained longer where required by law (e.g., financial records)</li>
          </ul>

          <h2 id="availability">13. Service Availability</h2>
          <p>
            We strive to maintain high availability of the Service:
          </p>
          <ul>
            <li><strong>Target Uptime:</strong> We target 99.5% uptime, though this is not a guaranteed service level agreement (SLA)</li>
            <li><strong>Scheduled Maintenance:</strong> Planned maintenance will be scheduled during low-usage periods with advance notice where practical</li>
            <li><strong>Emergency Maintenance:</strong> We may perform unscheduled maintenance to address security or stability issues</li>
          </ul>

          <h3>No Guarantee of Availability</h3>
          <p>
            We do not guarantee uninterrupted or error-free operation of the Service. You acknowledge that:
          </p>
          <ul>
            <li>The Service may be unavailable due to maintenance, updates, or technical issues</li>
            <li>You should maintain backups of critical data outside the Service</li>
            <li>You should have contingency plans for periods when the Service is unavailable</li>
          </ul>
          <p>
            Enterprise tier customers may have separate SLA terms as specified in their service agreement.
          </p>

          <h2 id="liability">14. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL DURJ, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Loss of profits, revenue, or business opportunities</li>
            <li>Loss of data or data corruption</li>
            <li>Loss of goodwill or reputation</li>
            <li>Business interruption</li>
            <li>Cost of substitute services</li>
          </ul>
          <p>
            ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY.
          </p>
          <p>
            OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS ($100).
          </p>
          <p>
            SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES OR LIMITATION OF LIABILITY FOR CERTAIN DAMAGES. IN SUCH JURISDICTIONS, OUR LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
          </p>

          <h2 id="indemnification">15. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Durj and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any way connected with:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another party, including employees</li>
            <li>Any Content you upload to the Service</li>
            <li>Your violation of any applicable law or regulation</li>
            <li>Employment disputes between your Organisation and your employees</li>
            <li>Claims by employees regarding data processed through the Service</li>
            <li>WPS compliance failures or government penalties related to your payroll data</li>
          </ul>

          <h2 id="termination">16. Termination</h2>

          <h3>By You</h3>
          <p>
            You may terminate your account at any time through your account settings or by contacting us. Upon termination:
          </p>
          <ul>
            <li>Your subscription will end at the close of your current billing period (no prorated refunds)</li>
            <li>You will retain read-only access during the 90-day data retention period</li>
            <li>You should export your data before the retention period ends</li>
          </ul>

          <h3>By Us</h3>
          <p>
            We may suspend or terminate your account:
          </p>
          <ul>
            <li><strong>Immediately, without notice:</strong> If you materially breach these Terms, engage in illegal activity, or pose a security risk</li>
            <li><strong>With 30 days&apos; notice:</strong> For non-payment or extended periods of account inactivity</li>
            <li><strong>As required by law:</strong> If we are legally required to do so</li>
          </ul>

          <h3>Effect of Termination</h3>
          <p>
            Upon termination, your right to use the Service will immediately cease. Provisions that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnification, and limitations of liability.
          </p>

          <h2 id="governing-law">17. Governing Law and Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of Qatar, without regard to its conflict of law provisions.
          </p>
          <p>
            You agree to submit to the exclusive jurisdiction of the courts located in Doha, Qatar for the resolution of any disputes arising out of or relating to these Terms or the Service.
          </p>

          <h2 id="disputes">18. Dispute Resolution</h2>
          <p>
            Any dispute arising out of or relating to these Terms or the Service shall first be attempted to be resolved through good-faith negotiation:
          </p>
          <ol>
            <li><strong>Informal Resolution:</strong> Contact us at legal@durj.com with a description of your concern. We will attempt to resolve the matter within thirty (30) days.</li>
            <li><strong>Mediation:</strong> If informal resolution fails, either party may request mediation through a mutually agreed mediator in Qatar.</li>
            <li><strong>Arbitration:</strong> If mediation fails, disputes may be submitted to binding arbitration in accordance with the rules of the Qatar International Centre for Conciliation and Arbitration (QICCA).</li>
            <li><strong>Litigation:</strong> Either party retains the right to seek injunctive or equitable relief in the courts of Qatar.</li>
          </ol>
          <p>
            Enterprise customers may have different dispute resolution terms as specified in their service agreement.
          </p>

          <h2 id="general">19. General Provisions</h2>

          <h3>Entire Agreement</h3>
          <p>
            These Terms, together with our Privacy Policy and any additional terms for specific features, constitute the entire agreement between you and Durj regarding the Service.
          </p>

          <h3>Severability</h3>
          <p>
            If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
          </p>

          <h3>Waiver</h3>
          <p>
            Our failure to enforce any provision of these Terms shall not constitute a waiver of that provision or any other provision.
          </p>

          <h3>Assignment</h3>
          <p>
            You may not assign or transfer these Terms without our prior written consent. We may assign our rights and obligations under these Terms without restriction.
          </p>

          <h3>Force Majeure</h3>
          <p>
            Neither party shall be liable for any failure to perform due to causes beyond their reasonable control, including natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of transportation, facilities, fuel, energy, labour, or materials.
          </p>

          <h3>Notices</h3>
          <p>
            We may provide notices to you via email to the address associated with your account, through in-app notifications, or by posting on the Service. You may provide notices to us by email to legal@durj.com.
          </p>

          <h2 id="changes">20. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of any material changes by:
          </p>
          <ul>
            <li>Posting the new Terms on this page and updating the &quot;Last updated&quot; date</li>
            <li>Sending an email notification to Organisation Owners and Administrators</li>
            <li>Displaying an in-app notification when you next access the Service</li>
          </ul>
          <p>
            Your continued use of the Service after the changes take effect constitutes your acceptance of the new Terms. If you do not agree to the modified Terms, you must stop using the Service.
          </p>
          <p>
            For material changes that significantly affect your rights or obligations, we will provide at least 30 days&apos; notice before the changes take effect.
          </p>

          <h2 id="contact">21. Contact Us</h2>
          <div className="contact-box">
            <h3>Questions about these Terms?</h3>
            <p>
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <p>
              <strong>Legal Inquiries:</strong> <a href="mailto:legal@durj.com">legal@durj.com</a><br />
              <strong>General Support:</strong> <a href="mailto:support@durj.com">support@durj.com</a><br />
              <strong>Address:</strong> Doha, Qatar
            </p>
            <p>
              For privacy-related inquiries, please see our <Link href="/privacy">Privacy Policy</Link> or contact <a href="mailto:privacy@durj.com">privacy@durj.com</a>.
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

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * OVERVIEW:
 * Terms of Service page component that renders comprehensive legal terms
 * governing use of the Durj platform. Server-side rendered with Next.js
 * metadata export for SEO optimization.
 *
 * ARCHITECTURE:
 * - Server Component (default, no 'use client' directive)
 * - Single-page layout with navigation header and footer
 * - Uses shared landing.css stylesheet from parent directory
 * - Exports metadata object for page title and description
 *
 * SECTIONS COVERED:
 * 1. Acceptance of Terms - Legal binding agreement
 * 2. Definitions - Organization, roles, modules, tiers
 * 3. Description of Service - Platform capabilities
 * 4. User Accounts and Organizations - Registration, owner responsibilities
 * 5. Subscription and Payment - Tiers, billing, upgrades/downgrades
 * 6. Data Processing - Controller/processor responsibilities
 * 7. AI Features - Assistant limitations, disclaimers
 * 8. Payroll and Financial Features - WPS, accuracy disclaimers
 * 9. Third-Party Services - Provider acknowledgments
 * 10. Acceptable Use - Prohibited activities
 * 11. Intellectual Property - Ownership rights
 * 12. Data Export and Portability - Export capabilities, retention
 * 13. Service Availability - Uptime, maintenance
 * 14. Limitation of Liability - Damage caps
 * 15. Indemnification - User obligations
 * 16. Termination - Account closure terms
 * 17. Governing Law - Qatar jurisdiction
 * 18. Dispute Resolution - QICCA arbitration
 * 19. General Provisions - Severability, waiver, force majeure
 * 20. Changes to Terms - Notification process
 * 21. Contact Us - Legal contact information
 *
 * STRENGTHS:
 * - Comprehensive legal coverage appropriate for SaaS platform
 * - Clear definitions section for legal clarity
 * - Subscription tier table with limits clearly documented
 * - AI limitations and disclaimers properly highlighted
 * - WPS compliance and financial accuracy disclaimers
 * - Multi-tenant data controller/processor roles defined
 * - Qatar-specific jurisdiction and QICCA arbitration
 * - Employee user rights clearly distinguished from org users
 * - Cross-references to Privacy Policy for data details
 * - Well-organized with anchor links for navigation
 *
 * POTENTIAL IMPROVEMENTS:
 * - Extract common navigation and footer into shared components
 * - Subscription tier table could be moved to shared constants
 * - "Last updated" date is hardcoded - consider automating
 * - Missing structured data (JSON-LD) for legal document SEO
 * - Navigation links reference /#domains and /#security anchors
 * - Mobile navigation not implemented
 * - Uses standard img tags - should use Next.js Image component
 * - Limitation of liability section uses uppercase - consider styling
 *   alternatives for better readability
 *
 * SECURITY CONSIDERATIONS:
 * - Legal contact email intentionally exposed
 * - No user input handling (static content)
 * - All external links properly secured
 *
 * ACCESSIBILITY:
 * - Proper heading hierarchy maintained
 * - Tables include thead for accessibility
 * - Strong tags used for emphasis
 * - Ordered and unordered lists properly structured
 * - Could benefit from skip navigation link
 *
 * PERFORMANCE:
 * - Server-side rendered (no client JavaScript)
 * - Long page but static content benefits from caching
 * - Images could be optimized with Next.js Image component
 *
 * LEGAL NOTES:
 * - Governed by Qatar law with Doha jurisdiction
 * - QICCA (Qatar International Centre for Conciliation and Arbitration)
 * - Covers B2B SaaS multi-tenant architecture
 * - Employee user relationship with employer (not Durj) clarified
 * =============================================================================
 */
