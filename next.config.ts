import type { NextConfig } from 'next';
import { withEve } from 'eve/next';

// `vercel.json` explicitly declares the web and Eve services. On Vercel,
// withEve() detects that declaration and does not generate another Services
// config; outside Vercel it still provides the local Eve integration.
//
// Set USE_EVE=0 only when deploying the plain-Next control.
const USE_EVE = process.env.USE_EVE !== '0';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Surfaced to the client so /probe can label which build you are looking at.
  env: { NEXT_PUBLIC_USE_EVE: USE_EVE ? '1' : '0' },
  // Same router config as the app this was found in: route prediction OFF
  // (its locale-less rewrites made 16.3's default prediction 404-flash), and
  // the same router-cache staleTimes.
  experimental: {
    optimisticRouting: false,
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

// Named-agent mount, matching the app this was found in: routes live under
// /eve/agents/demo/eve/v1/*, and the generated Vercel service is `eve-demo`.
export default USE_EVE
  ? withEve(nextConfig, { agents: { demo: './agents/demo' } })
  : nextConfig;
