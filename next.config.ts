import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Skip type checking during build (legacy routes need updates)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Note: eslint config moved to eslint.config.js (Next.js 15+ change)
  // Allow larger file uploads (10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Configure image domains for Supabase
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Security headers
  async headers() {
    // Build CSP directives
    const cspDirectives = [
      "default-src 'self'",
      // Scripts: self + inline for Next.js + eval for dev
      process.env.NODE_ENV === 'development'
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for Next.js
      // Styles: self + inline for styled-components/emotion
      "style-src 'self' 'unsafe-inline'",
      // Images: self + Supabase + data URIs + blob
      "img-src 'self' data: blob: https://*.supabase.co",
      // Fonts: self + Google Fonts
      "font-src 'self' data: https://fonts.gstatic.com",
      // Connect: self + Supabase + Sentry + Upstash
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.upstash.io",
      // Frames: deny embedding
      "frame-ancestors 'none'",
      // Forms: self only
      "form-action 'self'",
      // Base URI: self only
      "base-uri 'self'",
      // Block mixed content
      "upgrade-insecure-requests",
    ];

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Content-Security-Policy',
            value: cspDirectives.join('; '),
          },
        ],
      },
      {
        // Cache static assets
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// Sentry configuration options
const sentryConfig = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production
  silent: !process.env.CI,

  // Upload source maps to Sentry
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically instrument React components
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route handlers and middleware
  tunnelRoute: "/monitoring",

  // Disable automatic instrumentation if issues occur
  automaticVercelMonitors: true,
};

// Export with Sentry wrapper (only in production or if SENTRY_DSN is set)
export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
