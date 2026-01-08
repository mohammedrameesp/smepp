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
          <p className="last-updated">Last updated: January 2025</p>

          <div className="toc">
            <h3>Table of Contents</h3>
            <ol>
              <li><a href="#information-we-collect">Information We Collect</a></li>
              <li><a href="#how-we-use">How We Use Your Information</a></li>
              <li><a href="#data-sharing">Data Sharing and Disclosure</a></li>
              <li><a href="#data-security">Data Security</a></li>
              <li><a href="#your-rights">Your Rights</a></li>
              <li><a href="#data-retention">Data Retention</a></li>
              <li><a href="#international-transfers">International Transfers</a></li>
              <li><a href="#changes">Changes to This Policy</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ol>
          </div>

          <p>
            At Durj (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our business operations platform.
          </p>

          <h2 id="information-we-collect">1. Information We Collect</h2>

          <h3>Personal Information</h3>
          <p>We collect information that you provide directly to us, including:</p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, phone number, job title, and company name when you create an account</li>
            <li><strong>Organization Data:</strong> Business name, address, industry type, and employee information you enter into the platform</li>
            <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely through our payment provider)</li>
            <li><strong>Communications:</strong> Information you provide when contacting our support team</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <p>When you use our platform, we automatically collect:</p>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform, and interaction patterns</li>
            <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and IP address</li>
            <li><strong>Log Data:</strong> Server logs including access times, error logs, and referring URLs</li>
          </ul>

          <h3>Cookies and Similar Technologies</h3>
          <p>
            We use cookies and similar tracking technologies to enhance your experience. For more details, please see our <Link href="/cookies">Cookie Policy</Link>.
          </p>

          <h2 id="how-we-use">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our platform and services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices, updates, security alerts, and administrative messages</li>
            <li>Respond to your comments, questions, and customer service requests</li>
            <li>Monitor and analyse trends, usage, and activities</li>
            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
            <li>Personalise and improve your experience</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 id="data-sharing">3. Data Sharing and Disclosure</h2>
          <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
          <ul>
            <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (hosting, payment processing, analytics)</li>
            <li><strong>Legal Requirements:</strong> When required by law, legal process, or governmental request</li>
            <li><strong>Protection of Rights:</strong> To protect our rights, privacy, safety, or property, and that of our users</li>
            <li><strong>Business Transfers:</strong> In connection with any merger, sale, or transfer of business assets</li>
            <li><strong>With Consent:</strong> With your explicit consent for any other purpose</li>
          </ul>

          <h2 id="data-security">4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your information, including:
          </p>
          <ul>
            <li>Encryption of data in transit (TLS/SSL) and at rest</li>
            <li>Regular security assessments and penetration testing</li>
            <li>Access controls and authentication requirements</li>
            <li>Secure data centres with physical security measures</li>
            <li>Employee training on data protection practices</li>
          </ul>
          <p>
            While we strive to protect your personal information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
          </p>

          <h2 id="your-rights">5. Your Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal information:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete information</li>
            <li><strong>Erasure:</strong> Request deletion of your personal information in certain circumstances</li>
            <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
            <li><strong>Portability:</strong> Request transfer of your data to another service provider</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Withdraw Consent:</strong> Withdraw consent where processing is based on consent</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us using the details provided below.
          </p>

          <h2 id="data-retention">6. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to fulfil the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When determining the retention period, we consider:
          </p>
          <ul>
            <li>The nature and sensitivity of the information</li>
            <li>The purposes for which we process the information</li>
            <li>Applicable legal, regulatory, and contractual requirements</li>
            <li>Whether the purpose of processing can be achieved by other means</li>
          </ul>
          <p>
            Organization data is retained for the duration of your subscription and for a reasonable period thereafter to allow for reactivation or data export.
          </p>

          <h2 id="international-transfers">7. International Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy, including:
          </p>
          <ul>
            <li>Standard contractual clauses approved by relevant authorities</li>
            <li>Processing by service providers in countries with adequate data protection laws</li>
            <li>Your explicit consent where required</li>
          </ul>

          <h2 id="changes">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this Privacy Policy periodically for any changes.
          </p>

          <h2 id="contact">9. Contact Us</h2>
          <div className="contact-box">
            <h3>Questions about this Privacy Policy?</h3>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:privacy@durj.com">privacy@durj.com</a><br />
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
