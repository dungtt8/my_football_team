import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const withPWAConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Force new service worker + JS bundle to activate immediately after deploy
  // instead of staying "waiting" while an old cached bundle keeps running in
  // already-open tabs (this is what causes "login succeeds but nothing
  // happens" after a new release — the tab is still executing old JS).
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      // Never cache API calls (auth/login, data fetches) — always hit network.
      urlPattern: /^https:\/\/api\.myteam\.revonexus\.net\/.*/i,
      handler: 'NetworkOnly',
      options: {
        cacheName: 'apiNoCache',
      },
    },
    {
      urlPattern: /^https:\/\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWAConfig(nextConfig);


