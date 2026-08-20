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
  // Same router-cache experiment as the app this was found in.
  experimental: {
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
