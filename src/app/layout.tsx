/**
 * @module app/layout
 * @description Root layout component for the Durj application.
 *
 * This is the top-level layout that wraps all pages in the application.
 * It provides:
 * - Global font configuration (Geist Sans and Geist Mono)
 * - Viewport and metadata settings for SEO and mobile optimization
 * - Application-wide providers (auth, theme, etc.)
 * - Main content wrapper for consistent page structure
 *
 * @see {@link module:components/providers} - Application providers
 * @see {@link module:components/main-content} - Main content wrapper
 */
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import MainContent from "@/components/main-content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#475569",
};

export const metadata: Metadata = {
  title: "Durj | Business Management Platform",
  description: "All-in-one asset, HR, and operations management for SMBs",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  icons: {
    icon: "/sme-icon-shield-512.png",
    apple: "/sme-icon-shield-512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <MainContent>{children}</MainContent>
        </Providers>
      </body>
    </html>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Root layout component that wraps all pages in the Durj application,
 * providing global fonts, metadata, and application providers.
 *
 * Key Features:
 * - Geist Sans and Geist Mono font configuration via CSS variables
 * - SEO metadata with robots noindex/nofollow for private SaaS
 * - Viewport configuration for mobile optimization (disables user scaling)
 * - Theme color for browser chrome integration
 * - Application-wide provider hierarchy (auth, theme, query client, etc.)
 *
 * Security Considerations:
 * - robots: noindex/nofollow prevents indexing of private application
 * - suppressHydrationWarning on html/body for theme flicker prevention
 *
 * Potential Improvements:
 * - Consider making robots directive configurable for marketing pages
 * - Add structured data for SEO on public marketing routes
 * - Consider adding analytics script integration point
 *
 * Dependencies:
 * - @/components/providers: Application provider hierarchy
 * - @/components/main-content: Main content wrapper with layout logic
 */
