import Link from 'next/link';
import '../landing.css';

export const metadata = {
  title: 'Cookie Policy | Durj',
  description: 'Learn how Durj uses cookies and similar technologies on our platform.',
};

export default function CookiePolicyPage() {
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
          <h1>Cookie Policy</h1>
          <p className="last-updated">Last updated: January 2025</p>

          <div className="toc">
            <h3>Table of Contents</h3>
            <ol>
              <li><a href="#what-are-cookies">What Are Cookies</a></li>
              <li><a href="#types-of-cookies">Types of Cookies We Use</a></li>
              <li><a href="#third-party">Third-Party Cookies</a></li>
              <li><a href="#managing">Managing Cookies</a></li>
              <li><a href="#changes">Changes to This Policy</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ol>
          </div>

          <p>
            This Cookie Policy explains how Durj (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar technologies when you visit our website or use our platform. This policy should be read alongside our <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <h2 id="what-are-cookies">1. What Are Cookies</h2>
          <p>
            Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.
          </p>
          <p>
            Cookies can be &quot;persistent&quot; (remaining on your device until deleted or until they expire) or &quot;session&quot; cookies (deleted when you close your browser).
          </p>

          <h2 id="types-of-cookies">2. Types of Cookies We Use</h2>

          <h3>Essential Cookies</h3>
          <p>
            These cookies are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you, such as setting your privacy preferences, logging in, or filling in forms.
          </p>
          <ul>
            <li><strong>Authentication:</strong> Keep you logged in during your session</li>
            <li><strong>Security:</strong> Protect against cross-site request forgery and other security threats</li>
            <li><strong>Session management:</strong> Remember your preferences during a session</li>
            <li><strong>Load balancing:</strong> Distribute traffic across servers for optimal performance</li>
          </ul>

          <h3>Analytics Cookies</h3>
          <p>
            These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us understand which pages are the most and least popular.
          </p>
          <ul>
            <li><strong>Page views:</strong> Track which pages you visit</li>
            <li><strong>Time on site:</strong> Measure how long you spend on our platform</li>
            <li><strong>Error tracking:</strong> Identify technical issues to improve reliability</li>
            <li><strong>Feature usage:</strong> Understand which features are most useful</li>
          </ul>
          <p>
            All analytics data is aggregated and anonymised where possible. We do not use analytics to identify individual users.
          </p>

          <h3>Preference Cookies</h3>
          <p>
            These cookies enable the website to provide enhanced functionality and personalisation. They may be set by us or by third-party providers whose services we use.
          </p>
          <ul>
            <li><strong>Language preferences:</strong> Remember your language selection</li>
            <li><strong>Theme settings:</strong> Store your display preferences (light/dark mode)</li>
            <li><strong>Timezone:</strong> Display times in your local timezone</li>
            <li><strong>Table preferences:</strong> Remember your preferred page size and column visibility</li>
          </ul>

          <h2 id="third-party">3. Third-Party Cookies</h2>
          <p>
            We use services from trusted third parties that may set their own cookies. These include:
          </p>
          <ul>
            <li>
              <strong>Authentication Providers:</strong> When you sign in with Google or Microsoft, these services may set cookies to facilitate authentication.
            </li>
            <li>
              <strong>Payment Processors:</strong> Our payment provider may set cookies to process transactions securely.
            </li>
            <li>
              <strong>Error Monitoring:</strong> We use error tracking services to identify and fix bugs, which may set cookies.
            </li>
          </ul>
          <p>
            We do not use advertising or marketing cookies, and we do not sell data to third parties for advertising purposes.
          </p>

          <h2 id="managing">4. Managing Cookies</h2>
          <p>
            You can control and manage cookies in several ways:
          </p>

          <h3>Browser Settings</h3>
          <p>
            Most browsers allow you to refuse or delete cookies through their settings. The location of these settings varies by browser:
          </p>
          <ul>
            <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
            <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
            <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
            <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
          </ul>

          <h3>Impact of Disabling Cookies</h3>
          <p>
            Please note that if you disable essential cookies, you may not be able to use certain features of our platform, including:
          </p>
          <ul>
            <li>Staying logged in to your account</li>
            <li>Accessing secure areas of the platform</li>
            <li>Saving your preferences</li>
          </ul>

          <h2 id="changes">5. Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the &quot;Last updated&quot; date at the top of this policy.
          </p>
          <p>
            We encourage you to review this policy periodically to stay informed about how we use cookies.
          </p>

          <h2 id="contact">6. Contact Us</h2>
          <div className="contact-box">
            <h3>Questions about cookies?</h3>
            <p>
              If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
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
