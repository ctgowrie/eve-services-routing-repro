'use client';

import { useEffect, useState } from 'react';

// The bug is only visible on a request carrying all three segment-prefetch
// headers, which you cannot set by clicking a link — so the page issues the
// requests itself and reports what came back.

type Check = {
  label: string;
  detail: string;
  status?: number;
  contentType?: string;
  matchedPath?: string;
  ok?: boolean;
  error?: string;
};

const SEGMENT_PREFETCH_HEADERS = {
  RSC: '1',
  'Next-Router-Prefetch': '1',
  'Next-Router-Segment-Prefetch': '/_tree',
};

async function run(
  label: string,
  detail: string,
  path: string,
  headers: Record<string, string>,
  // When set, a 200 whose x-matched-path contains this substring is still a
  // FAILURE: the valid-shaped wrong tree ("poison") that freezes the router.
  poisonMatch?: string,
): Promise<Check> {
  try {
    const res = await fetch(path, { headers, cache: 'no-store' });
    const contentType = res.headers.get('content-type') ?? '';
    const matchedPath = res.headers.get('x-matched-path') ?? '—';
    const poisoned = poisonMatch !== undefined && matchedPath.includes(poisonMatch);
    return {
      label,
      detail,
      status: res.status,
      contentType,
      matchedPath,
      ok:
        res.status === 200 &&
        contentType.includes('text/x-component') &&
        !poisoned,
    };
  } catch (e) {
    return { label, detail, error: String(e) };
  }
}

export function ProbeView() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const usingEve = process.env.NEXT_PUBLIC_USE_EVE === '1';

  useEffect(() => {
    const bust = `?_rsc=probe${Date.now()}`;
    Promise.all([
      run(
        'Segment prefetch',
        'GET /static + RSC:1 + Next-Router-Prefetch:1 + Next-Router-Segment-Prefetch:/_tree',
        `/static${bust}`,
        SEGMENT_PREFETCH_HEADERS,
      ),
      run(
        'Plain RSC (control)',
        'GET /static + RSC:1 only — must be 200 on both builds',
        `/static${bust}`,
        { RSC: '1' },
      ),
      run(
        'Literal artifact (control)',
        'GET /static.segments/_tree.segment.rsc — the file the route above should reach',
        '/static.segments/_tree.segment.rsc',
        {},
      ),
      run(
        'Lab interception _tree',
        'GET /en/lab/sudoku + segment-prefetch headers — a 200 matched by /[locale]/[...rest] is the poisoned tree that freezes the modal',
        `/en/lab/sudoku${bust}`,
        SEGMENT_PREFETCH_HEADERS,
        '[...rest]',
      ),
    ]).then(setChecks);
  }, []);

  const verdict = checks?.[0];

  return (
    <main
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        maxWidth: 780,
        margin: '40px auto',
        padding: '0 20px',
        lineHeight: 1.5,
      }}>
      <h1 style={{ fontSize: 20 }}>
        Next.js 16 segment cache probe
      </h1>
      <p>
        Build: <strong>{usingEve ? 'withEve() APPLIED' : 'withEve() BYPASSED'}</strong>
        {' · '}
        <a href="https://github.com/dominiksipowicz/eve-services-routing-repro">
          repro &amp; write-up
        </a>
        {' · '}
        <a href="/en/lab">try the modal yourself: /en/lab</a>
      </p>

      {!checks && <p>running…</p>}

      {verdict && (
        <div
          style={{
            background: verdict.ok ? '#0d3b1e' : '#4a0d0d',
            color: verdict.ok ? '#7ee2a8' : '#ff9c9c',
            border: `1px solid ${verdict.ok ? '#1c7a42' : '#a02121'}`,
            borderRadius: 8,
            padding: '16px 20px',
            margin: '24px 0',
            fontSize: 18,
          }}>
          {verdict.ok
            ? 'WORKING — the segment prefetch returned the segment tree.'
            : 'BROKEN — the segment prefetch did not return the segment tree.'}
        </div>
      )}

      {checks?.map((c) => (
        <div
          key={c.label}
          style={{
            borderTop: '1px solid #333',
            padding: '14px 0',
          }}>
          <div style={{ fontWeight: 700 }}>
            {c.ok ? '✅' : '❌'} {c.label}
          </div>
          <div style={{ opacity: 0.7, fontSize: 13, margin: '4px 0 8px' }}>
            {c.detail}
          </div>
          {c.error ? (
            <div>error: {c.error}</div>
          ) : (
            <div style={{ fontSize: 13 }}>
              <div>status: {c.status}</div>
              <div>content-type: {c.contentType || '—'}</div>
              <div>x-matched-path: {c.matchedPath}</div>
            </div>
          )}
        </div>
      ))}

      <p style={{ opacity: 0.7, fontSize: 13, marginTop: 28 }}>
        Expected on a healthy deployment: all three green, with the first
        matching <code>/static.segments/_tree.segment.rsc</code>. On a broken
        one only the first fails — the artifact exists and a plain RSC request
        is fine, so the route matched and its destination was never resolved.
      </p>
    </main>
  );
}
