'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'durj-cookie-consent';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(31, 41, 55, 0.98)',
        backdropFilter: 'blur(10px)',
        padding: '1rem 1.5rem',
        zIndex: 9999,
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ flex: '1 1 auto', minWidth: '280px' }}>
          <p
            style={{
              color: 'white',
              fontSize: '0.95rem',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            We use cookies to improve your experience and analyze site usage.
            By continuing to use our site, you consent to our use of cookies.{' '}
            <Link
              href="/cookies"
              style={{
                color: '#93c5fd',
                textDecoration: 'underline',
              }}
            >
              Learn more
            </Link>
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleDecline}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backgroundColor: 'transparent',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'white',
              color: '#1f2937',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
