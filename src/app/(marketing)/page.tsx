/**
 * @module app/(marketing)/page
 * @description Main landing page for Durj marketing site.
 * Features hero section, pain points addressing SME challenges,
 * AI and WhatsApp feature highlights, feature grid with modules,
 * Qatar-specific benefits, platform capabilities, CTA section, and footer.
 * Uses client-side rendering for mobile menu state management.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Navigation */}
      <nav className="nav" id="nav">
        <div className="container">
          <div className="nav-inner">
            <Link href="/" className="logo">
              <img src="/sme-wordmark-transparent.png" alt="Durj" className="h-8 w-auto" />
            </Link>
            <ul className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
              <li><a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a></li>
              <li><a href="#qatar" onClick={() => setMobileMenuOpen(false)}>Why Qatar</a></li>
              <li><a href="#platform" onClick={() => setMobileMenuOpen(false)}>Platform</a></li>
            </ul>
            <div className="nav-cta">
              <Link href="/get-started" className="btn btn-primary">Get Started</Link>
            </div>
            <button
              className="mobile-menu-btn"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
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
                <a href="#features" className="btn btn-secondary btn-large">View Features</a>
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
              These common headaches cost businesses time and money. Durj solves them all.
            </p>
          </div>
          <div className="pain-points-grid">
            {[
              { emoji: '📋', problem: '"I forgot to renew the trade license..."', solution: 'Expiry alerts for all company documents - CR, licenses, insurance' },
              { emoji: '💻', problem: '"Which laptop does Ahmed have?"', solution: 'Asset assignment tracking with full history in one click' },
              { emoji: '🛂', problem: '"Someone\'s passport is expiring?"', solution: 'Employee document tracking - QID, passport, health card expiry alerts' },
              { emoji: '🏖️', problem: '"How many leave days does Sara have left?"', solution: 'Real-time leave balance tracking with approval workflow' },
              { emoji: '🛒', problem: '"Who approved this purchase?"', solution: 'Multi-level approval workflows with full audit history' },
              { emoji: '💳', problem: '"How much are we spending on software?"', solution: 'Subscription cost dashboard with renewal date tracking' },
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

      {/* AI & WhatsApp Section */}
      <section className="smart-features" id="smart">
        <div className="container">
          <div className="section-header">
            <div className="section-label">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
                <circle cx="12" cy="12" r="6"/>
              </svg>
              Smart Features
            </div>
            <h2 className="section-title">Work Smarter, Not Harder</h2>
            <p className="section-description">
              Stop browsing through menus. Just ask questions naturally or approve requests
              directly from WhatsApp.
            </p>
          </div>
          <div className="smart-grid">
            {/* AI Assistant */}
            <div className="smart-card ai-card">
              <div className="smart-card-header">
                <div className="smart-card-icon ai">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                    <path d="M21 12a9 9 0 0 0-9-9"/>
                  </svg>
                </div>
                <div>
                  <h3 className="smart-card-title">AI Assistant</h3>
                  <p className="smart-card-subtitle">Ask anything about your business data</p>
                </div>
              </div>
              <div className="ai-chat-mockup">
                <div className="ai-message user">
                  <div className="ai-message-content">Whose QIDs are expiring this month?</div>
                </div>
                <div className="ai-message assistant">
                  <div className="ai-message-content">
                    <strong>3 employees have QIDs expiring in January:</strong>
                    <ul>
                      <li>Ahmed Hassan - expires Jan 15</li>
                      <li>Sara Al-Mahmoud - expires Jan 22</li>
                      <li>Mohammed Ali - expires Jan 28</li>
                    </ul>
                    <span className="ai-action">Would you also like to check health cards, contracts, or work permits?</span>
                  </div>
                </div>
                <div className="ai-suggestions">
                  <span className="ai-suggestion">Show leave balances for Hassan</span>
                  <span className="ai-suggestion">What are this month's credit card charges</span>
                  <span className="ai-suggestion">Who is using the MacBook Pro</span>
                </div>
              </div>
              <div className="smart-card-footer">
                <span className="smart-badge">No more browsing through menus</span>
              </div>
            </div>

            {/* WhatsApp Approvals */}
            <div className="smart-card whatsapp-card">
              <div className="smart-card-header">
                <div className="smart-card-icon whatsapp">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="smart-card-title">WhatsApp Approvals</h3>
                  <p className="smart-card-subtitle">Approve requests without opening the app</p>
                </div>
              </div>
              <div className="whatsapp-mockup">
                <div className="whatsapp-header">
                  <div className="whatsapp-avatar">D</div>
                  <div className="whatsapp-contact">
                    <div className="whatsapp-name">Durj Notifications</div>
                    <div className="whatsapp-status">Business Account</div>
                  </div>
                </div>
                <div className="whatsapp-messages">
                  <div className="whatsapp-message incoming">
                    <div className="whatsapp-message-content">
                      <div className="whatsapp-message-title">🏖️ Leave Request</div>
                      <div className="whatsapp-message-body">
                        <strong>Sara Al-Mahmoud</strong> is requesting leave:<br/>
                        Type: Annual Leave<br/>
                        Dates: Jan 20 - Jan 24 (5 days)<br/>
                        Balance after: 15 days remaining
                      </div>
                      <div className="whatsapp-message-actions">
                        <span className="whatsapp-btn approve">✓ Approve</span>
                        <span className="whatsapp-btn reject">✗ Reject</span>
                      </div>
                    </div>
                    <div className="whatsapp-time">10:32 AM</div>
                  </div>
                </div>
              </div>
              <div className="smart-card-footer">
                <span className="smart-badge">Reply to approve or reject</span>
              </div>
            </div>
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
              From asset tracking to leave management, Durj provides a comprehensive suite
              of tools designed specifically for SMEs in Qatar.
            </p>
          </div>
          <div className="features-grid">
            {[
              { icon: '📦', color: 'teal', title: 'Asset Management', desc: 'Track all your hardware and equipment with complete lifecycle management.', list: ['Assignment & request workflows', 'Warranty expiry alerts', 'Depreciation tracking'] },
              { icon: '💳', color: 'blue', title: 'Subscription Tracking', desc: 'Stop paying for unused subscriptions. Track all your SaaS and services.', list: ['Renewal date alerts', 'Cost analysis dashboard', 'Spending trends'] },
              { icon: '👥', color: 'purple', title: 'HR & Employees', desc: 'Complete employee management with document tracking.', list: ['QID & passport expiry alerts', 'Employee self-service portal', 'Profile change requests'] },
              { icon: '🏖️', color: 'amber', title: 'Leave Management', desc: 'Complete leave request and approval workflow for your team.', list: ['Balance tracking & calendar view', 'WhatsApp approval notifications', 'Multiple leave types'] },
              { icon: '🛒', color: 'cyan', title: 'Spend Requests', desc: 'Streamline internal spending with multi-level approval workflows.', list: ['Multi-level approvals', 'WhatsApp notifications', 'Full audit trail'] },
              { icon: '💰', color: 'emerald', title: 'Payroll & WPS', desc: 'Full payroll processing with Qatar WPS compliance built-in.', list: ['WPS file generation', 'Gratuity (EOSB) calculations', 'Employee loans'], comingSoon: true },
            ].map((feature, i) => (
              <div key={i} className={`feature-card ${feature.comingSoon ? 'coming-soon' : ''}`}>
                {feature.comingSoon && <div className="coming-soon-badge">Coming Soon</div>}
                <div className={`feature-icon ${feature.color}`}>{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.desc}</p>
                <ul className="feature-list">
                  {feature.list.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="also-includes">
            <div className="also-includes-label">Also Includes</div>
            <div className="also-includes-items">
              <div className="also-includes-item">
                <span className="also-includes-icon">📊</span>
                <span>Reports & Analytics</span>
              </div>
              <div className="also-includes-item">
                <span className="also-includes-icon">🚚</span>
                <span>Supplier Management</span>
              </div>
              <div className="also-includes-item">
                <span className="also-includes-icon">📄</span>
                <span>Company Documents</span>
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
                Durj is designed from the ground up for businesses operating in Qatar.
                From QAR currency handling to labor law compliance, every feature understands
                the local business landscape.
              </p>
              <div className="qatar-features">
                <div className="qatar-feature">
                  <div className="qatar-feature-icon">🛂</div>
                  <div className="qatar-feature-text">
                    <h4>QID & Visa Tracking</h4>
                    <p>Never miss a renewal - alerts for QID, visa, and residency permits</p>
                  </div>
                </div>
                <div className="qatar-feature">
                  <div className="qatar-feature-icon">📋</div>
                  <div className="qatar-feature-text">
                    <h4>Trade License (CR) Alerts</h4>
                    <p>Track Commercial Registration, municipality licenses, and insurance</p>
                  </div>
                </div>
                <div className="qatar-feature">
                  <div className="qatar-feature-icon">🏥</div>
                  <div className="qatar-feature-text">
                    <h4>Health Card Monitoring</h4>
                    <p>Employee health card and medical insurance expiry tracking</p>
                  </div>
                </div>
                <div className="qatar-feature">
                  <div className="qatar-feature-icon">🇶🇦</div>
                  <div className="qatar-feature-text">
                    <h4>Qatar Business Context</h4>
                    <p>QAR currency, Qatar timezone, and local holiday calendar</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="qatar-visual">
              <div className="qatar-stat-card">
                <div className="qatar-stat-icon">🛂</div>
                <div className="qatar-stat-value">QID</div>
                <div className="qatar-stat-label">Tracking</div>
              </div>
              <div className="qatar-stat-card">
                <div className="qatar-stat-icon">📋</div>
                <div className="qatar-stat-value">CR</div>
                <div className="qatar-stat-label">Licenses</div>
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

      {/* Platform Section */}
      <section className="security" id="platform">
        <div className="container">
          <div className="security-content">
            <div className="security-visual">
              <div className="security-card">
                <div className="security-header">
                  <div className="security-shield">🚀</div>
                  <div>
                    <div className="security-title">Platform Features</div>
                    <div className="security-status">● Modern & Secure</div>
                  </div>
                </div>
                <div className="security-items">
                  {[
                    { icon: '📱', title: 'WhatsApp Alerts', desc: 'Approval notifications sent directly to WhatsApp' },
                    { icon: '🔐', title: 'Enterprise SSO', desc: 'Google, Microsoft Azure AD, or custom OAuth' },
                    { icon: '🌐', title: 'Custom Domain', desc: 'Use your own domain (app.yourcompany.com)' },
                    { icon: '✅', title: 'Multi-level Approvals', desc: 'Configurable approval workflows for your team' },
                    { icon: '👤', title: 'Employee Self-Service', desc: 'Portal for leave, profile updates, and documents' },
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
              <h2>Built for Modern Teams</h2>
              <p>
                A platform designed for how your team actually works. From WhatsApp notifications
                to enterprise SSO — Durj fits seamlessly into your workflow.
              </p>
              <div className="security-badges">
                {['🔒 HTTPS Encryption', '📝 Audit Trail', '✅ Role-Based Access', '📊 Activity Logs'].map((badge, i) => (
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

      {/* Pricing Section - Temporarily Hidden
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
      */}

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
                <a href="#features" className="btn btn-secondary btn-large">View Features</a>
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
                <img src="/sme-wordmark-white.png" alt="Durj" className="h-8 w-auto" />
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
                {/* <li><a href="#pricing">Pricing</a></li> */}
                <li><a href="#platform">Platform</a></li>
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
              © 2025 Durj. All rights reserved. Built with ❤️ in Qatar.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * OVERVIEW:
 * Main landing page for the Durj marketing site. Client-side component that
 * renders a comprehensive marketing page with multiple sections showcasing
 * the platform's features, Qatar-specific benefits, and call-to-action elements.
 *
 * ARCHITECTURE:
 * - Client Component ('use client' for mobile menu interactivity)
 * - Single-page layout with multiple themed sections
 * - Uses local landing.css stylesheet for custom styling
 * - No external data fetching (static marketing content)
 *
 * SECTIONS:
 * 1. Navigation - Logo, links, CTA buttons, mobile menu toggle
 * 2. Hero - Main value proposition with dashboard preview mockup
 * 3. Pain Points - Problem/solution cards addressing SME challenges
 * 4. Smart Features - AI assistant and WhatsApp approvals highlights
 * 5. Features - Module grid (Assets, Subscriptions, HR, Leave, etc.)
 * 6. Qatar - Qatar-specific benefits (QID, CR, health cards, QAR)
 * 7. Platform - Security and modern team features
 * 8. Pricing - Commented out (temporarily hidden)
 * 9. CTA - Final call-to-action section
 * 10. Footer - Links and contact information
 *
 * STRENGTHS:
 * - Well-structured sections with clear visual hierarchy
 * - Mobile-responsive menu implementation with useState
 * - Rich visual mockups (dashboard preview, chat mockups)
 * - Strong focus on Qatar market (QID, WPS, QAR, local compliance)
 * - Feature cards use map() for maintainable content rendering
 * - Proper aria attributes on mobile menu button
 * - Internal anchor links for smooth navigation
 * - Clear value proposition and pain point messaging
 *
 * POTENTIAL IMPROVEMENTS:
 * - Extract section components for better maintainability
 * - Feature data (pain points, features, Qatar features) could be moved
 *   to separate constants file for easier content updates
 * - Missing metadata export (page uses client directive, but could use
 *   generateMetadata or move metadata to a parent layout)
 * - Uses standard img tags - should use Next.js Image for optimization
 * - Hardcoded copyright year "2025" in footer (inconsistent with other pages
 *   that use new Date().getFullYear())
 * - Pricing section commented out - should be fully removed or enabled
 * - Some inline styles could be moved to CSS classes
 * - Mobile menu visibility class logic could use clsx/cn utility
 * - Emoji usage in feature icons may not render consistently cross-platform
 *
 * SECURITY CONSIDERATIONS:
 * - No user input handling
 * - All links are internal or mailto (no external attack vectors)
 * - No sensitive data exposure
 *
 * ACCESSIBILITY:
 * - Mobile menu button has aria-label and aria-expanded
 * - Semantic section elements used
 * - Could benefit from skip navigation link
 * - Feature list items could use role="list" explicitly
 * - Color contrast should be verified in landing.css
 *
 * PERFORMANCE:
 * - Client-side rendering required only for mobile menu state
 * - Consider extracting static sections to Server Components
 * - Images should be optimized with Next.js Image component
 * - CSS is imported directly (bundled with component)
 * =============================================================================
 */
