import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  return (
    <>
      {/* Navigation */}
      <nav className="nav" id="nav">
        <div className="container">
          <div className="nav-inner">
            <Link href="/" className="logo">
              <img src="/sme-wordmark-transparent.png" alt="SME++" className="h-8 w-auto" />
            </Link>
            <ul className="nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#domains">Modules</a></li>
              <li><a href="#qatar">Why Qatar</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
            <div className="nav-cta">
              <Link href="/get-started" className="btn btn-primary">Get Started</Link>
            </div>
            <button className="mobile-menu-btn" aria-label="Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <div className="hero-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                Built for Qatar SMEs
              </div>
              <h1>Track Everything. <span>Miss Nothing.</span></h1>
              <p className="hero-description">
                From asset assignments to leave approvals, from expiring documents to pending
                purchases — manage every request and track every deadline in one place.
              </p>
              <div className="hero-cta">
                <Link href="/get-started" className="btn btn-primary btn-large">Start Free</Link>
                <a href="#pricing" className="btn btn-secondary btn-large">View Pricing</a>
              </div>
              <div className="hero-stats">
                <div className="stat">
                  <div className="stat-value">Zero</div>
                  <div className="stat-label">Fines</div>
                </div>
                <div className="stat">
                  <div className="stat-value">Zero</div>
                  <div className="stat-label">Surprises</div>
                </div>
                <div className="stat">
                  <div className="stat-value">Zero</div>
                  <div className="stat-label">Spreadsheets</div>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-image">
                <div className="dashboard-preview">
                  <div className="dashboard-header">
                    <span className="dashboard-dot red"></span>
                    <span className="dashboard-dot yellow"></span>
                    <span className="dashboard-dot green"></span>
                  </div>
                  <div className="dashboard-cards">
                    <div className="mini-card">
                      <div className="mini-card-icon" style={{ background: 'var(--primary-100)' }}>📦</div>
                      <div className="mini-card-value">248</div>
                      <div className="mini-card-label">Total Assets</div>
                    </div>
                    <div className="mini-card">
                      <div className="mini-card-icon" style={{ background: '#dbeafe' }}>💳</div>
                      <div className="mini-card-value">32</div>
                      <div className="mini-card-label">Subscriptions</div>
                    </div>
                    <div className="mini-card">
                      <div className="mini-card-icon" style={{ background: '#ede9fe' }}>👥</div>
                      <div className="mini-card-value">45</div>
                      <div className="mini-card-label">Employees</div>
                    </div>
                  </div>
                  <div className="dashboard-chart">
                    <div className="chart-bar" style={{ height: '40%' }}></div>
                    <div className="chart-bar" style={{ height: '60%' }}></div>
                    <div className="chart-bar" style={{ height: '45%' }}></div>
                    <div className="chart-bar" style={{ height: '80%' }}></div>
                    <div className="chart-bar" style={{ height: '65%' }}></div>
                    <div className="chart-bar" style={{ height: '90%' }}></div>
                    <div className="chart-bar" style={{ height: '55%' }}></div>
                    <div className="chart-bar" style={{ height: '70%' }}></div>
                  </div>
                </div>
              </div>
              <div className="floating-card alert">
                <div className="icon">⚠️</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>3 Documents Expiring</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Next 30 days</div>
                </div>
              </div>
              <div className="floating-card stats">
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Monthly Spend</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>QAR 5,400</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="pain-points" id="problems">
        <div className="container">
          <div className="pain-points-header">
            <div className="pain-points-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Replace Excel + Reduce Surprises
            </div>
            <h2 className="pain-points-title">Sound <span>Familiar?</span></h2>
            <p className="pain-points-subtitle">
              These common headaches cost businesses time and money. SME++ solves them all.
            </p>
          </div>
          <div className="pain-points-grid">
            {[
              { emoji: '📋', problem: '"I forgot to renew the trade license..."', solution: 'Expiry alerts for all company documents - CR, licenses, insurance' },
              { emoji: '💻', problem: '"Which laptop does Ahmed have?"', solution: 'Asset assignment tracking with full history in one click' },
              { emoji: '💳', problem: '"How much are we spending on software?"', solution: 'Subscription cost dashboard with renewal tracking' },
              { emoji: '🛂', problem: '"Someone\'s passport is expiring?"', solution: 'Employee document tracking - QID, passport, visa expiry alerts' },
              { emoji: '🛒', problem: '"Who approved this purchase?"', solution: 'Simple purchase approval trail with full audit history' },
              { emoji: '🚗', problem: '"The car registration expired!"', solution: 'Vehicle & Istimara tracking with insurance reminders' },
              { emoji: '🏖️', problem: '"How many leave days does Sara have left?"', solution: 'Real-time leave balance tracking with approval workflow' },
              { emoji: '💰', problem: '"WPS file rejected again..."', solution: 'Qatar-compliant WPS file generation, every time' },
              { emoji: '🚚', problem: '"What was that supplier\'s contact?"', solution: 'Centralized supplier database with engagement history' },
            ].map((item, i) => (
              <div key={i} className="pain-card">
                <div className="pain-emoji">{item.emoji}</div>
                <div className="pain-problem">
                  <div className="pain-icon problem">✗</div>
                  <div className="pain-text">{item.problem}</div>
                </div>
                <div className="pain-solution">
                  <div className="pain-icon solution">✓</div>
                  <div className="solution-text">{item.solution}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-label">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Powerful Features
            </div>
            <h2 className="section-title">Everything You Need to Run Your Business</h2>
            <p className="section-description">
              From asset tracking to payroll management, SME++ provides a comprehensive suite
              of tools designed specifically for SMEs in Qatar.
            </p>
          </div>
          <div className="features-grid">
            {[
              { icon: '📦', color: 'teal', title: 'Asset Management', desc: 'Track all your hardware and equipment with complete lifecycle management.', list: ['Assignment history tracking', 'Warranty & maintenance alerts', 'QR code asset labels', 'Depreciation calculations'] },
              { icon: '💳', color: 'blue', title: 'Subscription Tracking', desc: 'Never miss a renewal. Monitor all your SaaS and service subscriptions.', list: ['Renewal date alerts', 'Cost analysis dashboard', 'License utilization', 'Spending trends'] },
              { icon: '👥', color: 'purple', title: 'HR & Employees', desc: 'Manage employee profiles with comprehensive document tracking.', list: ['QID & passport expiry alerts', 'Visa tracking', 'Employee onboarding', 'Profile management'] },
              { icon: '🏖️', color: 'amber', title: 'Leave Management', desc: 'Complete leave request and approval workflow for your team.', list: ['Multiple leave types', 'Balance tracking', 'Team calendar view', 'Approval workflow'] },
              { icon: '💰', color: 'emerald', title: 'Payroll Processing', desc: 'Qatar-compliant payroll with WPS file generation.', list: ['Salary structures', 'WPS file generation', 'Gratuity calculations', 'Loans & advances'] },
              { icon: '🚚', color: 'rose', title: 'Supplier Management', desc: 'Manage your vendors with a complete registration and approval workflow.', list: ['Supplier registration', 'Approval workflow', 'Engagement tracking', 'Contact management'] },
              { icon: '🛒', color: 'cyan', title: 'Purchase Requests', desc: 'Streamline procurement with approval workflows and cost tracking.', list: ['Request submission', 'Multi-level approval', 'Cost categorization', 'Multi-currency support'] },
              { icon: '📄', color: 'indigo', title: 'Company Documents', desc: 'Track all your business licenses and compliance documents.', list: ['Trade license (CR) tracking', 'Municipality licenses', 'Insurance policies', 'Expiry alerts'] },
              { icon: '📊', color: 'orange', title: 'Reports & Analytics', desc: 'Comprehensive reporting with Excel exports and activity logs.', list: ['Dashboard insights', 'Excel exports', 'Activity audit trail', 'Cost analysis'] },
            ].map((feature, i) => (
              <div key={i} className="feature-card">
                <div className={`feature-icon ${feature.color}`}>{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.desc}</p>
                <ul className="feature-list">
                  {feature.list.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domains Section */}
      <section className="domains" id="domains">
        <div className="container">
          <div className="section-header">
            <div className="section-label">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              Organized by Domain
            </div>
            <h2 className="section-title">Three Integrated Business Domains</h2>
            <p className="section-description">
              Our modular architecture organizes features into logical business domains,
              making it easy to find what you need.
            </p>
          </div>
          <div className="domains-grid">
            <div className="domain-card">
              <div className="domain-header">
                <div className="domain-icon hr">👥</div>
                <div>
                  <h3 className="domain-title">HR Management</h3>
                  <p className="domain-subtitle">Human resources, leave, and payroll</p>
                </div>
              </div>
              <div className="domain-features">
                <div className="domain-feature"><span className="domain-feature-icon">👤</span> Employee Profiles</div>
                <div className="domain-feature"><span className="domain-feature-icon">📋</span> Document Expiry</div>
                <div className="domain-feature"><span className="domain-feature-icon">🏖️</span> Leave Requests</div>
                <div className="domain-feature"><span className="domain-feature-icon">📅</span> Team Calendar</div>
                <div className="domain-feature"><span className="domain-feature-icon">💰</span> Payroll Runs</div>
                <div className="domain-feature"><span className="domain-feature-icon">🎁</span> Gratuity Calculator</div>
              </div>
            </div>
            <div className="domain-card">
              <div className="domain-header">
                <div className="domain-icon ops">📦</div>
                <div>
                  <h3 className="domain-title">Operations</h3>
                  <p className="domain-subtitle">Assets, subscriptions, suppliers & procurement</p>
                </div>
              </div>
              <div className="domain-features">
                <div className="domain-feature"><span className="domain-feature-icon">💻</span> Asset Registry</div>
                <div className="domain-feature"><span className="domain-feature-icon">💳</span> Subscriptions</div>
                <div className="domain-feature"><span className="domain-feature-icon">🚚</span> Suppliers</div>
                <div className="domain-feature"><span className="domain-feature-icon">🛒</span> Purchase Requests</div>
              </div>
            </div>
            <div className="domain-card">
              <div className="domain-header">
                <div className="domain-icon system">⚙️</div>
                <div>
                  <h3 className="domain-title">System</h3>
                  <p className="domain-subtitle">Administration and configuration</p>
                </div>
              </div>
              <div className="domain-features">
                <div className="domain-feature"><span className="domain-feature-icon">👥</span> User Management</div>
                <div className="domain-feature"><span className="domain-feature-icon">📄</span> Company Documents</div>
                <div className="domain-feature"><span className="domain-feature-icon">📈</span> Reports</div>
                <div className="domain-feature"><span className="domain-feature-icon">📜</span> Activity Log</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Qatar Section */}
      <section className="qatar" id="qatar">
        <div className="container">
          <div className="qatar-content">
            <div className="qatar-text">
              <h2>Built Specifically for Qatar</h2>
              <p>
                SME++ is designed from the ground up for businesses operating in Qatar.
                From QAR currency handling to WPS compliance, every feature understands
                the local business landscape.
              </p>
              <div className="qatar-features">
                <div className="qatar-feature">
                  <div className="qatar-feature-icon">🇶🇦</div>
                  <div className="qatar-feature-text">
                    <h4>Qatar Labor Law Compliance</h4>
                    <p>Gratuity calculations, leave entitlements, and WPS file generation</p>
                  </div>
                </div>
                <div className="qatar-feature">
                  <div className="qatar-feature-icon">💵</div>
                  <div className="qatar-feature-text">
                    <h4>QAR as Default Currency</h4>
                    <p>Multi-currency support with automatic QAR conversion</p>
                  </div>
                </div>
                <div className="qatar-feature">
                  <div className="qatar-feature-icon">📋</div>
                  <div className="qatar-feature-text">
                    <h4>Document Tracking</h4>
                    <p>QID, passport, visa, and trade license expiry alerts</p>
                  </div>
                </div>
                <div className="qatar-feature">
                  <div className="qatar-feature-icon">🕐</div>
                  <div className="qatar-feature-text">
                    <h4>Qatar Timezone</h4>
                    <p>All dates display in Asia/Qatar (UTC+3) timezone</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="qatar-visual">
              <div className="qatar-stat-card">
                <div className="qatar-stat-icon">📄</div>
                <div className="qatar-stat-value">WPS</div>
                <div className="qatar-stat-label">File Generation</div>
              </div>
              <div className="qatar-stat-card">
                <div className="qatar-stat-icon">🎁</div>
                <div className="qatar-stat-value">Auto</div>
                <div className="qatar-stat-label">Gratuity Calc</div>
              </div>
              <div className="qatar-stat-card">
                <div className="qatar-stat-icon">📅</div>
                <div className="qatar-stat-value">30+</div>
                <div className="qatar-stat-label">Day Alerts</div>
              </div>
              <div className="qatar-stat-card">
                <div className="qatar-stat-icon">💳</div>
                <div className="qatar-stat-value">QAR</div>
                <div className="qatar-stat-label">Native Currency</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="security" id="security">
        <div className="container">
          <div className="security-content">
            <div className="security-visual">
              <div className="security-card">
                <div className="security-header">
                  <div className="security-shield">🛡️</div>
                  <div>
                    <div className="security-title">Security Status</div>
                    <div className="security-status">● All Systems Operational</div>
                  </div>
                </div>
                <div className="security-items">
                  {[
                    { icon: '🔐', title: 'Azure AD Authentication', desc: 'Enterprise-grade SSO integration' },
                    { icon: '⚡', title: 'Rate Limiting', desc: 'Token bucket algorithm protection' },
                    { icon: '📝', title: 'Audit Trail', desc: 'Complete activity logging' },
                    { icon: '📁', title: 'Secure File Storage', desc: 'Magic number verification' },
                  ].map((item, i) => (
                    <div key={i} className="security-item">
                      <div className="security-item-icon">{item.icon}</div>
                      <div className="security-item-text">
                        <div className="security-item-title">{item.title}</div>
                        <div className="security-item-desc">{item.desc}</div>
                      </div>
                      <span className="security-check">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="security-text">
              <h2>Enterprise-Grade Security</h2>
              <p>
                Your business data deserves the highest level of protection. SME++ implements
                industry-leading security measures to keep your information safe.
              </p>
              <div className="security-badges">
                {['🔒 HTTPS Encryption', '🛡️ CSRF Protection', '✅ Input Validation', '👥 Role-Based Access', '🔍 IDOR Protection', '📋 Security Headers'].map((badge, i) => (
                  <div key={i} className="security-badge">
                    <span className="security-badge-icon">{badge.split(' ')[0]}</span>
                    {badge.split(' ').slice(1).join(' ')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing" id="pricing">
        <div className="container">
          <div className="section-header">
            <div className="section-label">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Simple Pricing
            </div>
            <h2 className="section-title">Free Forever. Or Go Plus.</h2>
            <p className="section-description">
              All core features are free. Upgrade to Plus for notifications & storage.
              No limits on assets, subscriptions, or employees.
            </p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-name">Free</div>
              <div className="pricing-desc">Everything that doesn&apos;t cost us</div>
              <div className="pricing-price">
                <span className="pricing-currency">QAR</span>
                <span className="pricing-amount">0</span>
                <span className="pricing-period">/forever</span>
              </div>
              <ul className="pricing-features">
                <li><span className="check">✓</span> <strong style={{ color: 'var(--success)' }}>Unlimited</strong> employees</li>
                <li><span className="check">✓</span> <strong style={{ color: 'var(--success)' }}>Unlimited</strong> assets</li>
                <li><span className="check">✓</span> <strong style={{ color: 'var(--success)' }}>Unlimited</strong> subscriptions</li>
                <li><span className="check">✓</span> Asset management</li>
                <li><span className="check">✓</span> Leave management</li>
                <li><span className="check">✓</span> Payroll & WPS</li>
                <li><span className="check">✓</span> Reports & dashboards</li>
                <li><span className="check">✓</span> In-app notifications</li>
              </ul>
              <Link href="/get-started" className="btn btn-secondary pricing-btn">Start Free</Link>
            </div>
            <div className="pricing-card popular">
              <div className="pricing-name">Plus</div>
              <div className="pricing-desc">Full notifications & storage</div>
              <div className="pricing-price">
                <span className="pricing-currency">QAR</span>
                <span className="pricing-amount">200</span>
                <span className="pricing-period">/month</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                billed annually, or QAR 250/month
              </div>
              <ul className="pricing-features">
                <li><span className="check">✓</span> Everything in Free</li>
                <li><span className="check">✓</span> <strong style={{ color: 'var(--primary)' }}>Custom domain</strong></li>
                <li><span className="check">✓</span> <strong style={{ color: 'var(--primary)' }}>Google & Microsoft SSO</strong></li>
                <li><span className="check">✓</span> <strong style={{ color: 'var(--primary)' }}>Email alerts</strong></li>
                <li><span className="check">✓</span> <strong style={{ color: 'var(--primary)' }}>WhatsApp alerts</strong></li>
                <li><span className="check">✓</span> <strong style={{ color: 'var(--primary)' }}>Image/File uploads (10 GB)</strong></li>
                <li><span className="check">✓</span> Priority support</li>
              </ul>
              <Link href="/get-started" className="btn btn-primary pricing-btn">Get Started</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <h2>Ready to Streamline Your Operations?</h2>
              <p>
                Be among the first Qatar businesses to manage your assets, subscriptions, and employees — all in one place.
              </p>
              <div className="cta-buttons">
                <Link href="/get-started" className="btn btn-primary btn-large">Start Free</Link>
                <a href="#pricing" className="btn btn-secondary btn-large">View Pricing</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo" style={{ color: 'white' }}>
                <img src="/sme-wordmark-white.png" alt="SME++" className="h-8 w-auto" />
              </Link>
              <p>
                Operations, Upgraded. The all-in-one business operations platform for Qatar SMEs.
                Track assets, subscriptions, employees, and compliance — all in one place.
              </p>
            </div>
            <div>
              <div className="footer-title">Product</div>
              <ul className="footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#security">Security</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-title">Get Started</div>
              <ul className="footer-links">
                <li><Link href="/get-started">Create Account</Link></li>
                <li><a href="#pricing">View Pricing</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-title">Contact</div>
              <ul className="footer-links">
                <li><a href="mailto:hello@smepp.com">hello@smepp.com</a></li>
                <li><a href="#qatar">Why Qatar</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copyright">
              © 2025 SME++. All rights reserved. Built with ❤️ in Qatar.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
