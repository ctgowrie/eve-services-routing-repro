# Vercel Services (V2 routing) breaks Next.js segment prefetch — eve is the trigger, and the documented `services` workaround breaks the whole app

A minimal, deployed reproduction of [vercel/eve#768](https://github.com/vercel/eve/issues/768),
refined from [eve-segment-prefetch-repro](https://github.com/dominiksipowicz/eve-segment-prefetch-repro)
after the original `/_tree` 500/poison was partially fixed platform-side (correct
trees for plain dynamic routes). **Route interception is still broken** on every eve
deployment, and the manual `vercel.json` `services` escape hatch the eve docs describe
makes things dramatically worse.

Versions: **eve 0.40.0, next 16.3.1** (both latest at time of writing — three failing
version combos were confirmed on the production app this was found in; eve's Next
integration is byte-identical through 0.42.0, so upgrading changes nothing).

## UPDATE 2026-08-20 — ownership established: it's the platform's V2 services router

Full evidence in [`FINDINGS-2026-08-20.md`](./FINDINGS-2026-08-20.md). The short version:

1. **The Build Output is NOT the problem.** Local `vercel build` A/B (`USE_EVE=0/1`,
   CLI 59.1.4 / @vercel/next 4.21.6): Next's 46-route table is **byte-identical** in both
   outputs — including the `$segmentPath` has-capture segment-prefetch route, correctly
   ordered. The eve build adds exactly one service route plus top-level `services` +
   `experimentalServicesV2` keys. The routes are all there; the **runtime router**
   evaluates them differently when `services` is present.
2. **This minimal tree does NOT recover** (contrary to what an earlier revision of this
   README said): on BROKEN, `/en/lab` with three links and zero interaction enters an
   **infinite prefetch loop** — ~40 req/s sustained, 1,627 requests in the first minute,
   every one a billable function invocation. CONTROL issues exactly 6 prefetches and
   stops. Clicking a card mounts the modal with a **corrupted param**:
   `useParams()` returns `slug = "(.)sudoku"` — the interception marker leaks into
   userland — while the loop continues underneath.
3. **The router applies rewrite phases twice / out of order.** Captured on BROKEN:
   `x-nextjs-rewritten-path: /en/lab/(.)(.)encyclopedia.rsc` (interception marker
   applied twice; CONTROL: single `(.)`), and `/_tree` probes returning params like
   `locale="%5Blocale%5D.segments"`, `rest="_tree.segment"` — the bracketed artifact
   path was built, URL-encoded, and re-matched as a page URL instead of being served.
4. **The loop defeats next 16.3.1's own loop fix** ([#97128](https://github.com/vercel/next.js/pull/97128)),
   because that fix assumes a refetched `/_tree` reflects the server's real routing —
   the V2 router violates that on every request.

Same-family platform issues (all "works standalone, breaks under `services`", all filed
within weeks of the services public beta):
[vercel/vercel#16924](https://github.com/vercel/vercel/issues/16924),
[#16915](https://github.com/vercel/vercel/issues/16915),
[#16296](https://github.com/vercel/vercel/issues/16296).

## Three deployments, one commit

The only difference is the build-time `USE_EVE` env var and (for the third) a
`vercel.json` copied from [`vercel.services.json`](./vercel.services.json).

| | deploy script | |
|---|---|---|
| ✅ **CONTROL** — `withEve()` bypassed | `npm run deploy:control` | **https://eve-services-repro-control.vercel.app** |
| ❌ **BROKEN** — `withEve()` named-agent mount | `npm run deploy:broken` | **https://eve-services-repro-broken.vercel.app** |
| 💥 **WORKAROUND** — manual `services` in `vercel.json` | `npm run deploy:workaround` | **https://eve-services-repro-workaround.vercel.app** |

## Reproduce by clicking (the user-facing symptom)

Open `/en/lab` on each deployment and click any card:

- **CONTROL**: the app opens in a modal over the catalog (route interception works).
- **BROKEN**: the wire-level poison is deterministic (see the curl below and `/probe`).
  On the production app this was found in, it freezes the click: the URL changes to
  `/en/lab/<slug>`, the modal never mounts, and the router loops the same prefetches —
  a deterministically red Playwright e2e
  (`expect(getByTestId('lab-app-modal')).toBeVisible()` times out) on every eve preview,
  across eve 0.39.1/0.40.0 × next 16.3.0/16.3.1. **As of 2026-08-20 this minimal tree
  exhibits the full failure too**: an infinite prefetch loop (~40 req/s) starts on page
  load with no interaction, and the modal mounts with a corrupted
  `slug = "(.)sudoku"` param — see [`FINDINGS-2026-08-20.md`](./FINDINGS-2026-08-20.md).
- **WORKAROUND**: unambiguous — on this repro **every route returns 404**: `/en`,
  `/en/lab`, even the eve service's own `/eve/agents/demo/eve/v1/health`. The deployment
  builds and reports Ready, then serves nothing. On the production app the same config
  flipped the e2e suite from 40/41 passing to **1/41 passing** (timeouts and missing
  elements everywhere).

## Or verify with curl — no auth, no clone

```bash
CONTROL=https://eve-services-repro-control.vercel.app
BROKEN=https://eve-services-repro-broken.vercel.app

probe() { curl -sS -o /dev/null \
  -w "%{http_code} %{content_type}  x-matched-path=%header{x-matched-path}\n" \
  -H 'RSC: 1' -H 'Next-Router-Prefetch: 1' -H 'Next-Router-Segment-Prefetch: /_tree' \
  "$1/en/lab/sudoku?_rsc=x"; }

probe $CONTROL   # 200 text/x-component  x-matched-path=/[locale]/lab/[slug].segments/_tree.segment.rsc (or equivalent)
probe $BROKEN    # 200 text/x-component  x-matched-path=/[locale]/[...rest]   <-- the poison
```

The broken deployment returns a **200 with a valid-shaped but wrong router tree**: the
segment-prefetch request falls through to the `[locale]/[...rest]` catch-all. The client
segment cache stores it; the click applies it; the interception modal can never reconcile;
the router loops. A 404/500 would be survivable — the *parseable wrong tree* is the poison.

Each deployment also self-diagnoses at **`/probe`** (`/en/lab` linked from there): four
checks with status, content-type and `x-matched-path` printed, including the
interception-poison check.

## Why the workaround fails

`ensureEveVercelOutputConfig` (eve ≥ 0.39.x) backs off when `vercel.json` declares a
`services` block, so the clobbering of Next's Build Output routes is avoided — that part
works. But declaring the web app itself as a `services` entry changes how the platform
routes the *entire* deployment, and the result is far more broken than eve's clobber:

- `routePrefix` on a service entry is **schema-rejected** ("should NOT have additional
  property `routePrefix`") even though eve's docs and `@vercel/config`'s legacy
  `experimentalServices` type describe it.
- The schema-valid shape (top-level rewrite with a `{ service, path }` destination —
  exactly what this repo's [`vercel.services.json`](./vercel.services.json) uses) deploys
  successfully and then breaks navigation app-wide.

## Mechanism (corrected 2026-08-20)

On Vercel (`process.env.VERCEL`), `withEve` writes `.vercel/output/config.json` at
next.config *evaluation* time, containing only eve's service route plus a top-level
`services` block. The platform's build pipeline then **correctly merges** this with
`@vercel/next`'s full route table (this merge was fixed in July 2026:
[vercel/vercel#16889](https://github.com/vercel/vercel/pull/16889),
[#16938](https://github.com/vercel/vercel/pull/16938)) — the deployed Build Output is
complete and correct, verified by local `vercel build` A/B.

What breaks is **request-time evaluation**: the presence of the `services` key switches
the deployment onto the platform's closed-source "V2 routing" engine, which mis-executes
the route chain — has-header captures (`$segmentPath`) and the
`continue`/`check`/`override` phases behave differently from the classic router
(double-applied rewrites, artifact paths re-matched as page URLs). Requests carrying
`Next-Router-Segment-Prefetch` land on whatever the fallback produces — here the locale
catch-all, which politely 200s a wrong tree. There is no opt-out flag (removed in
eve 0.11.0), eve cannot merge later (no eve code can run after `@vercel/next`), and the
only documented alternative (manual `services`) is what the third deployment demonstrates.

## Layout notes (mirrors the production app)

- Named agent (`withEve(cfg, { agents: { demo: './agents/demo' } })`) mounted at
  `/eve/agents/demo/eve/v1/*` — the named-agent mount is what production apps use, and its
  generated service name (`eve-demo`) is what the manual `services` block must reproduce.
- `[locale]` dynamic segment fed by a middleware rewrite, a `[locale]/[...rest]` catch-all
  for localized 404s (the standard i18n recipe — and the poison's landing spot), and a
  parallel-route `@modal` + `(.)[slug]` interception under `/[locale]/lab`.
- Deleting the catch-all does NOT fix the modal (tested on the production app: identical
  frozen-catalog failure), so the catch-all is an amplifier for *other* symptoms, not the
  cause of this one.

## Run locally (everything works — the bug is Vercel-only)

```bash
npm install
npm run dev   # or: USE_EVE=0 npm run dev
```
