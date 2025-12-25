import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalHeader } from "@/components/conditional-header";
import { Providers } from "@/components/providers";
import MainContent from "@/components/main-content";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/core/auth";
import { prisma } from "@/lib/core/prisma";

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
  title: "SME++ | Business Management Platform",
  description: "All-in-one asset, HR, and operations management for SMBs",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SME++",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    apple: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get enabled modules from database for header/mobile sidebar
  const session = await getServerSession(authOptions);
  let enabledModules: string[] = ['assets', 'subscriptions', 'suppliers'];

  if (session?.user?.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { enabledModules: true },
    });
    if (org?.enabledModules?.length) {
      enabledModules = org.enabledModules;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <ConditionalHeader enabledModules={enabledModules} />
          <MainContent>{children}</MainContent>
        </Providers>
      </body>
    </html>
  );
}
