# eve on Vercel breaks Next.js route interception — and the documented `services` workaround breaks the whole app

A minimal, deployed reproduction of [vercel/eve#768](https://github.com/vercel/eve/issues/768),
refined from [eve-segment-prefetch-repro](https://github.com/dominiksipowicz/eve-segment-prefetch-repro)
after the original `/_tree` 500/poison was partially fixed (eve ≥ 0.39.1 returns a correct
tree for plain dynamic routes). **Route interception is still broken** on every eve
deployment, and the manual `vercel.json` `services` escape hatch the eve docs describe
makes things dramatically worse.

Versions: **eve 0.40.0, next 16.3.1** (both latest at time of writing — three failing
version combos were confirmed on the production app this was found in).

## Three deployments, one commit

The only difference is the build-time `USE_EVE` env var and (for the third) a
`vercel.json` copied from [`vercel.services.json`](./vercel.services.json).

| | deploy script | |
|---|---|---|
| ✅ **CONTROL** — `withEve()` bypassed | `npm run deploy:control` | TBD |
| ❌ **BROKEN** — `withEve()` named-agent mount | `npm run deploy:broken` | TBD |
| 💥 **WORKAROUND** — manual `services` in `vercel.json` | `npm run deploy:workaround` | TBD |

## Reproduce by clicking (the user-facing symptom)

Open `/en/lab` on each deployment and click any card:

- **CONTROL**: the app opens in a modal over the catalog (route interception works).
- **BROKEN**: the URL changes to `/en/lab/<slug>` and *nothing else happens*. The modal
  never mounts and DevTools shows the router looping the same prefetch requests. This is
  the exact failure a production app hit: a deterministic red Playwright e2e
  (`expect(getByTestId('lab-app-modal')).toBeVisible()` times out) on every eve preview.
- **WORKAROUND**: much worse — broad navigation/routing failures across the app, not just
  the modal. On the production app this config flipped the e2e suite from 40/41 passing to
  **1/41 passing**.

## Or verify with curl — no auth, no clone

```bash
CONTROL=TBD
BROKEN=TBD

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

## Mechanism recap (from the original repro, still true)

On Vercel (`process.env.VERCEL`), `withEve` writes `.vercel/output/config.json` at
next.config *evaluation* time — before `@vercel/next` emits the real Build Output carrying
the header-conditioned segment-prefetch routes. Requests with
`Next-Router-Segment-Prefetch` then route as if the header did not exist and land on
whatever the filesystem/rewrite fallback produces — here the locale catch-all, which
politely 200s a wrong tree. There is no opt-out flag (removed in eve 0.11.0), and the only
documented alternative (manual `services`) is what the third deployment demonstrates.

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
