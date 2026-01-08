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
          <p className="last-updated">Last updated: January 2025</p>

          <div className="toc">
            <h3>Table of Contents</h3>
            <ol>
              <li><a href="#acceptance">Acceptance of Terms</a></li>
              <li><a href="#description">Description of Service</a></li>
              <li><a href="#accounts">User Accounts</a></li>
              <li><a href="#subscription">Subscription and Payment</a></li>
              <li><a href="#acceptable-use">Acceptable Use</a></li>
              <li><a href="#intellectual-property">Intellectual Property</a></li>
              <li><a href="#liability">Limitation of Liability</a></li>
              <li><a href="#indemnification">Indemnification</a></li>
              <li><a href="#termination">Termination</a></li>
              <li><a href="#governing-law">Governing Law</a></li>
              <li><a href="#disputes">Dispute Resolution</a></li>
              <li><a href="#changes">Changes to Terms</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ol>
          </div>

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

          <h2 id="description">2. Description of Service</h2>
          <p>
            Durj is a business operations platform that provides tools for managing assets, subscriptions, employees, leave requests, and other operational functions. The Service is provided on a subscription basis with different tiers offering varying features and limits.
          </p>
          <p>
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
          </p>

          <h2 id="accounts">3. User Accounts</h2>

          <h3>Account Registration</h3>
          <p>To use the Service, you must create an account by providing accurate and complete information. You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorised use of your account</li>
            <li>Ensuring all users added to your organisation comply with these Terms</li>
          </ul>

          <h3>Organisation Accounts</h3>
          <p>
            When you create an organisation on Durj, you become the organisation owner. As the owner, you are responsible for managing user access, roles, and permissions within your organisation. You agree to only add users who have consented to the use of the Service.
          </p>

          <h2 id="subscription">4. Subscription and Payment</h2>

          <h3>Pricing</h3>
          <p>
            Our subscription plans and pricing are available on our website. Prices are subject to change, but we will provide notice of any price increases before they take effect on your next billing cycle.
          </p>

          <h3>Billing</h3>
          <ul>
            <li>Subscriptions are billed in advance on a monthly or annual basis</li>
            <li>All fees are non-refundable except as required by law</li>
            <li>You authorise us to charge your payment method for all fees</li>
            <li>Failed payments may result in suspension of your account</li>
          </ul>

          <h3>Free Trial</h3>
          <p>
            We may offer free trials at our discretion. At the end of the trial period, your account will be automatically converted to a paid subscription unless you cancel before the trial ends.
          </p>

          <h2 id="acceptable-use">5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of any laws</li>
            <li>Upload or transmit viruses, malware, or other malicious code</li>
            <li>Attempt to gain unauthorised access to any part of the Service</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Scrape, crawl, or use automated means to access the Service without permission</li>
            <li>Resell, sublicense, or redistribute the Service without authorisation</li>
            <li>Use the Service to store or transmit infringing or illegal content</li>
            <li>Impersonate any person or entity or misrepresent your affiliation</li>
            <li>Harass, abuse, or harm another person through the Service</li>
          </ul>

          <h2 id="intellectual-property">6. Intellectual Property</h2>

          <h3>Our Rights</h3>
          <p>
            The Service and its original content, features, and functionality are owned by Durj and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>

          <h3>Your Rights</h3>
          <p>
            You retain ownership of any data you upload to the Service. By using the Service, you grant us a limited licence to use, store, and process your data solely to provide and improve the Service.
          </p>

          <h3>Feedback</h3>
          <p>
            Any feedback, suggestions, or ideas you provide about the Service may be used by us without any obligation to you.
          </p>

          <h2 id="liability">7. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL DURJ, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
          </p>
          <p>
            OUR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>

          <h2 id="indemnification">8. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Durj and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any way connected with:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another party</li>
            <li>Any content you upload to the Service</li>
          </ul>

          <h2 id="termination">9. Termination</h2>

          <h3>By You</h3>
          <p>
            You may terminate your account at any time by contacting us or through your account settings. Upon termination, you will lose access to the Service and your data may be deleted after a retention period.
          </p>

          <h3>By Us</h3>
          <p>
            We may suspend or terminate your account immediately, without prior notice, if you breach these Terms or if we are required to do so by law. We may also terminate inactive accounts after extended periods of non-use.
          </p>

          <h3>Effect of Termination</h3>
          <p>
            Upon termination, your right to use the Service will immediately cease. Provisions that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
          </p>

          <h2 id="governing-law">10. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of Qatar, without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts located in Qatar for the resolution of any disputes.
          </p>

          <h2 id="disputes">11. Dispute Resolution</h2>
          <p>
            Any dispute arising out of or relating to these Terms or the Service shall first be attempted to be resolved through good-faith negotiation. If the dispute cannot be resolved through negotiation within thirty (30) days, either party may pursue formal dispute resolution.
          </p>
          <p>
            For business customers, disputes may be submitted to binding arbitration in accordance with the rules of the Qatar International Centre for Conciliation and Arbitration.
          </p>

          <h2 id="changes">12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after the changes take effect constitutes your acceptance of the new Terms.
          </p>

          <h2 id="contact">13. Contact Us</h2>
          <div className="contact-box">
            <h3>Questions about these Terms?</h3>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:legal@durj.com">legal@durj.com</a><br />
              <strong>Address:</strong> Doha, Qatar
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
