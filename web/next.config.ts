import type { NextConfig } from 'next';
import { withEve } from 'eve/next';

// ---------------------------------------------------------------------------
// THREE DEPLOYMENTS, ONE COMMIT.
//   USE_EVE=0  -> withEve() bypassed                       -> everything works
//   USE_EVE=1  -> withEve() named-agent mount (generated)  -> route interception
//                 breaks (the modal never mounts)
//   USE_EVE=1 + vercel.json copied from vercel.services.json
//              -> the "declare the services yourself" workaround: withEve()
//                 detects the services block and writes nothing, the platform
//                 wires the service natively -> the WHOLE app breaks
//
// Driven by a build-time env var so variants deploy from the same commit:
//   npm run deploy:control | deploy:broken | deploy:workaround
// ---------------------------------------------------------------------------
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
// Casey's nested-web experiment: the Next app now lives in web/, so the agent
// sits one level up. vercel.json declares the services, so withEve backs off
// writing .vercel/output/config.json either way.
export default USE_EVE
  ? withEve(nextConfig, { agents: { demo: '../agents/demo' } })
  : nextConfig;
