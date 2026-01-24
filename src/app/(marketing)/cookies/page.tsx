import Link from 'next/link';
import '../landing.css';

export const metadata = {
  title: 'Cookie Policy | Durj',
  description: 'Learn how Durj uses cookies, local storage, and similar technologies on our platform.',
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
          <h1>Cookie Policy</h1>
          <p className="last-updated">Last updated: January 21, 2025</p>

          <p>
            This Cookie Policy explains how Durj (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar technologies when you visit our website or use our platform. This policy should be read alongside our <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <h2 id="what-are-cookies">1. What Are Cookies</h2>
          <p>
            Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners.
          </p>
          <p>
            Cookies can be &quot;persistent&quot; (remaining on your device until deleted or until they expire) or &quot;session&quot; cookies (deleted when you close your browser). First-party cookies are set by the website you are visiting, while third-party cookies are set by external services used on the website.
          </p>

          <h2 id="how-we-use">2. How We Use Cookies</h2>
          <p>
            Durj uses cookies and similar technologies to provide, protect, and improve our platform. Specifically, we use them to:
          </p>
          <ul>
            <li><strong>Keep you logged in securely:</strong> Authentication cookies maintain your session so you don&apos;t have to log in repeatedly</li>
            <li><strong>Remember your preferences:</strong> Store your theme (light/dark mode), timezone, language, and UI preferences</li>
            <li><strong>Ensure security:</strong> CSRF protection tokens prevent cross-site request forgery attacks</li>
            <li><strong>Understand usage patterns:</strong> Anonymous analytics help us improve platform performance and features</li>
            <li><strong>Provide AI chat functionality:</strong> Store conversation context for the AI assistant</li>
            <li><strong>Optimize performance:</strong> Load balancing and caching improve response times</li>
          </ul>

          <h3>What We Do NOT Use Cookies For</h3>
          <p>
            We believe in privacy-respecting practices. Durj does <strong>not</strong> use cookies for:
          </p>
          <ul>
            <li>Advertising, marketing, or behavioral targeting</li>
            <li>Tracking you across other websites</li>
            <li>Selling or sharing data with third parties for advertising purposes</li>
            <li>Building advertising profiles</li>
          </ul>

          <h2 id="types-of-cookies">3. Types of Cookies We Use</h2>

          <h3>3.1 Essential Cookies</h3>
          <p>
            These cookies are strictly necessary for the platform to function and cannot be disabled. They are set in response to your actions, such as logging in, setting preferences, or filling in forms.
          </p>
          <ul>
            <li><strong>Authentication:</strong> Maintain your logged-in session and identity</li>
            <li><strong>Security:</strong> CSRF tokens protect against cross-site request forgery</li>
            <li><strong>Session management:</strong> Track your active session for security purposes</li>
            <li><strong>Load balancing:</strong> Distribute traffic efficiently across servers</li>
            <li><strong>OAuth state:</strong> Securely manage sign-in flows with Google and Microsoft</li>
          </ul>

          <h3>3.2 Authentication Cookies</h3>
          <p>
            We use NextAuth.js for authentication, which sets several cookies to manage your session securely:
          </p>
          <ul>
            <li><strong>Session tokens:</strong> Encrypted tokens that identify your authenticated session</li>
            <li><strong>CSRF tokens:</strong> Protection against cross-site request forgery attacks</li>
            <li><strong>Callback URLs:</strong> Temporary storage of redirect URLs during OAuth flows</li>
            <li><strong>Provider state:</strong> Security tokens for Google and Microsoft OAuth flows</li>
          </ul>
          <p>
            When using &quot;Remember me&quot; functionality, session cookies may persist for up to 30 days. Otherwise, they expire when you close your browser.
          </p>

          <h3>3.3 Preference Cookies</h3>
          <p>
            These cookies remember your settings and preferences to provide a personalized experience:
          </p>
          <ul>
            <li><strong>Theme:</strong> Your light or dark mode preference</li>
            <li><strong>Language:</strong> Your preferred display language</li>
            <li><strong>Timezone:</strong> Display times in your local timezone</li>
            <li><strong>UI preferences:</strong> Sidebar collapse state, table page sizes, column visibility</li>
            <li><strong>Onboarding state:</strong> Track your progress through setup wizards</li>
          </ul>

          <h3>3.4 Analytics Cookies</h3>
          <p>
            These cookies help us understand how users interact with our platform so we can improve it:
          </p>
          <ul>
            <li><strong>Page views:</strong> Track which pages are most frequently visited</li>
            <li><strong>Feature usage:</strong> Understand which features are most useful</li>
            <li><strong>Performance metrics:</strong> Measure page load times and identify bottlenecks</li>
            <li><strong>Error tracking:</strong> Identify and fix technical issues quickly</li>
          </ul>
          <p>
            All analytics data is aggregated and anonymized where possible. We do not use analytics to identify individual users or track personal behavior.
          </p>

          <h2 id="cookie-table">4. Detailed Cookie Table</h2>
          <p>
            Below is a comprehensive list of cookies used on the Durj platform:
          </p>

          <h3>Essential Cookies</h3>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>next-auth.session-token</strong></td>
                <td>Stores your authenticated session (HTTP environments)</td>
                <td>Session or 30 days</td>
              </tr>
              <tr>
                <td><strong>__Secure-next-auth.session-token</strong></td>
                <td>Stores your authenticated session (HTTPS environments)</td>
                <td>Session or 30 days</td>
              </tr>
              <tr>
                <td><strong>next-auth.csrf-token</strong></td>
                <td>CSRF protection for form submissions</td>
                <td>Session</td>
              </tr>
              <tr>
                <td><strong>next-auth.callback-url</strong></td>
                <td>Stores redirect URL during OAuth authentication</td>
                <td>Session</td>
              </tr>
              <tr>
                <td><strong>__Host-next-auth.csrf-token</strong></td>
                <td>Secure CSRF token (HTTPS only)</td>
                <td>Session</td>
              </tr>
            </tbody>
          </table>

          <h3>Preference Cookies</h3>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>theme</strong></td>
                <td>Stores your light/dark mode preference</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><strong>sidebar-collapsed</strong></td>
                <td>Remembers sidebar open/closed state</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><strong>table-page-size</strong></td>
                <td>Your preferred number of rows per page in tables</td>
                <td>1 year</td>
              </tr>
              <tr>
                <td><strong>locale</strong></td>
                <td>Your preferred language setting</td>
                <td>1 year</td>
              </tr>
            </tbody>
          </table>

          <h3>Analytics Cookies (if enabled)</h3>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>_ga</strong></td>
                <td>Google Analytics - distinguishes unique users</td>
                <td>2 years</td>
              </tr>
              <tr>
                <td><strong>_gid</strong></td>
                <td>Google Analytics - distinguishes users</td>
                <td>24 hours</td>
              </tr>
              <tr>
                <td><strong>_gat</strong></td>
                <td>Google Analytics - throttles request rate</td>
                <td>1 minute</td>
              </tr>
            </tbody>
          </table>

          <h2 id="local-storage">5. Local Storage and Session Storage</h2>
          <p>
            In addition to cookies, Durj uses browser local storage and session storage to enhance your experience. These technologies store data directly in your browser.
          </p>

          <h3>Local Storage (Persistent)</h3>
          <p>
            Data stored in local storage persists until you clear your browser data:
          </p>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ai-chat-history</strong></td>
                <td>Stores AI conversation history for context continuity</td>
              </tr>
              <tr>
                <td><strong>theme-preference</strong></td>
                <td>Backup storage for light/dark mode preference</td>
              </tr>
              <tr>
                <td><strong>onboarding-progress</strong></td>
                <td>Tracks your progress through setup wizards</td>
              </tr>
              <tr>
                <td><strong>table-column-visibility-*</strong></td>
                <td>Remembers which columns you&apos;ve hidden in data tables</td>
              </tr>
              <tr>
                <td><strong>recent-organizations</strong></td>
                <td>Quick access list of your recent organizations</td>
              </tr>
            </tbody>
          </table>

          <h3>Session Storage (Temporary)</h3>
          <p>
            Data stored in session storage is cleared when you close your browser tab:
          </p>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>form-draft-*</strong></td>
                <td>Auto-saves form data so you don&apos;t lose work if you navigate away</td>
              </tr>
              <tr>
                <td><strong>search-history</strong></td>
                <td>Recent search queries for quick access</td>
              </tr>
              <tr>
                <td><strong>notification-dismissed</strong></td>
                <td>IDs of notifications you&apos;ve dismissed in this session</td>
              </tr>
              <tr>
                <td><strong>wizard-step</strong></td>
                <td>Current step in multi-step forms</td>
              </tr>
            </tbody>
          </table>

          <h3>Clearing Local and Session Storage</h3>
          <p>
            You can clear this data through your browser settings:
          </p>
          <ul>
            <li><strong>Chrome:</strong> Settings → Privacy and security → Clear browsing data → Cookies and other site data</li>
            <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data → Clear Data</li>
            <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong>Edge:</strong> Settings → Privacy, search, and services → Clear browsing data</li>
          </ul>

          <h2 id="third-party">6. Third-Party Cookies</h2>
          <p>
            We use services from trusted third parties that may set their own cookies. Below is a detailed list of these services:
          </p>

          <table className="legal-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Purpose</th>
                <th>Cookies</th>
                <th>More Info</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>NextAuth.js</strong></td>
                <td>Authentication framework</td>
                <td>next-auth.*</td>
                <td><a href="https://next-auth.js.org" target="_blank" rel="noopener noreferrer">next-auth.js.org</a></td>
              </tr>
              <tr>
                <td><strong>Google OAuth</strong></td>
                <td>Sign in with Google</td>
                <td>GAPS, LSID, APISID</td>
                <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></td>
              </tr>
              <tr>
                <td><strong>Microsoft Azure AD</strong></td>
                <td>Sign in with Microsoft</td>
                <td>ESTSAUTH*, buid, esctx</td>
                <td><a href="https://privacy.microsoft.com" target="_blank" rel="noopener noreferrer">Microsoft Privacy</a></td>
              </tr>
              <tr>
                <td><strong>Supabase</strong></td>
                <td>Database and file storage</td>
                <td>sb-*-auth-token</td>
                <td><a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Privacy</a></td>
              </tr>
              <tr>
                <td><strong>Stripe</strong></td>
                <td>Payment processing</td>
                <td>__stripe_mid, __stripe_sid</td>
                <td><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe Privacy</a></td>
              </tr>
              <tr>
                <td><strong>Sentry</strong></td>
                <td>Error monitoring</td>
                <td>sentry-sc</td>
                <td><a href="https://sentry.io/privacy" target="_blank" rel="noopener noreferrer">Sentry Privacy</a></td>
              </tr>
              <tr>
                <td><strong>Google Analytics</strong></td>
                <td>Usage analytics (if enabled)</td>
                <td>_ga, _gid, _gat</td>
                <td><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></td>
              </tr>
            </tbody>
          </table>
          <p>
            Third-party cookies are governed by the respective privacy policies of those services. We recommend reviewing their policies for detailed information about their data practices.
          </p>

          <h2 id="multi-tenant">7. Cookies in Multi-Tenant Environment</h2>
          <p>
            Durj is a multi-tenant platform where each organization has its own subdomain (e.g., <code>yourcompany.durj.com</code>). This architecture affects how cookies work:
          </p>

          <h3>Subdomain-Scoped Cookies</h3>
          <ul>
            <li><strong>Organization-specific preferences:</strong> Some preference cookies are scoped to your organization&apos;s subdomain, ensuring your settings don&apos;t affect other organizations</li>
            <li><strong>Session isolation:</strong> Your authentication session is tied to your organization&apos;s context</li>
            <li><strong>Data separation:</strong> Cookies cannot access data from other organizations&apos; subdomains</li>
          </ul>

          <h3>Cross-Subdomain Authentication</h3>
          <ul>
            <li>If you belong to multiple organizations, you may need to log in separately to each subdomain</li>
            <li>Session cookies are not shared between different organization subdomains for security</li>
            <li>Super admin sessions may use cross-subdomain cookies for platform management</li>
          </ul>

          <h3>Tenant Isolation</h3>
          <p>
            We implement strict tenant isolation to ensure:
          </p>
          <ul>
            <li>Your organization cannot access cookies from other organizations</li>
            <li>Other organizations cannot access your cookies or session data</li>
            <li>Cookie-based preferences are organization-specific where appropriate</li>
          </ul>

          <h2 id="managing">8. Managing Your Cookie Preferences</h2>

          <h3>Browser Controls</h3>
          <p>
            Most browsers allow you to control cookies through their settings. Here are links to cookie management for major browsers:
          </p>
          <ul>
            <li><strong>Chrome:</strong> <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Manage cookies in Chrome</a></li>
            <li><strong>Firefox:</strong> <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Manage cookies in Firefox</a></li>
            <li><strong>Safari:</strong> <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer">Manage cookies in Safari</a></li>
            <li><strong>Edge:</strong> <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Manage cookies in Edge</a></li>
          </ul>

          <h3>Platform Settings</h3>
          <p>
            You can manage certain preferences directly within Durj:
          </p>
          <ul>
            <li><strong>Theme preference:</strong> Change your light/dark mode in Account Settings</li>
            <li><strong>AI chat history:</strong> Clear your conversation history in AI Settings</li>
            <li><strong>Table preferences:</strong> Reset column visibility using the table settings menu</li>
          </ul>

          <h3>Impact of Disabling Cookies</h3>
          <p>
            Disabling different types of cookies will affect your experience:
          </p>
          <table className="legal-table">
            <thead>
              <tr>
                <th>Cookie Type</th>
                <th>If Disabled</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Essential cookies</strong></td>
                <td>You will not be able to log in or use the platform. These cannot be disabled.</td>
              </tr>
              <tr>
                <td><strong>Preference cookies</strong></td>
                <td>Your settings (theme, language, table preferences) will not persist between sessions.</td>
              </tr>
              <tr>
                <td><strong>Analytics cookies</strong></td>
                <td>No impact on your functionality. We simply won&apos;t collect usage data from your sessions.</td>
              </tr>
            </tbody>
          </table>

          <h3>No Cookie Consent Banner</h3>
          <p>
            Because Durj does not use cookies for advertising or marketing purposes, and because essential cookies are required for platform functionality, we do not display a cookie consent banner. All cookies we use fall into the categories of essential, preference, or analytics—none of which are used to track you for advertising purposes.
          </p>

          <h2 id="changes">9. Changes to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time to reflect changes in our practices, technologies we use, or for other operational, legal, or regulatory reasons.
          </p>
          <p>
            When we make changes, we will:
          </p>
          <ul>
            <li>Update the &quot;Last updated&quot; date at the top of this policy</li>
            <li>Notify you of material changes through in-app notifications</li>
            <li>Send email notifications for significant changes that affect your privacy</li>
          </ul>
          <p>
            We encourage you to review this policy periodically to stay informed about how we use cookies and similar technologies.
          </p>

          <h2 id="contact">10. Contact Us</h2>
          <div className="contact-box">
            <h3>Questions about cookies?</h3>
            <p>
              If you have any questions about our use of cookies, this Cookie Policy, or your privacy in general, please contact us:
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:privacy@durj.com">privacy@durj.com</a><br />
              <strong>General Inquiries:</strong> <a href="mailto:hello@durj.com">hello@durj.com</a><br />
              <strong>Address:</strong> Doha, Qatar
            </p>
            <p>
              For more information about how we handle your personal data, please see our <Link href="/privacy">Privacy Policy</Link>.
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
