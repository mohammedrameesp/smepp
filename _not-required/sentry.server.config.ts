// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Capture unhandled promise rejections
  integrations: [
    Sentry.prismaIntegration(),
  ],

  // Filter out common non-actionable errors
  ignoreErrors: [
    // Prisma connection errors during cold starts
    'PrismaClientInitializationError',
  ],

  // Add additional context to errors
  beforeSend(event) {
    // You can modify the event here before it's sent
    return event;
  },
});
