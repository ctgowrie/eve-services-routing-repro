import Link from 'next/link';

// The click origin, mirroring the real app: a locale-less URL served through
// the proxy rewrite from inside the [locale] tree. Its own segment-prefetch
// 500s, and so do those of both destinations.
export default async function FromPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main style={{ fontFamily: 'monospace', padding: 40, lineHeight: 2 }}>
      <h1>click origin (locale: {locale})</h1>
      <p><Link href="/deep" id="go-deep">go to /deep</Link></p>
      <p><Link href="/deep/create" id="go-two">go to /deep/create (two segments)</Link></p>
      <p><Link href="/" id="go-home">go home</Link></p>
    </main>
  );
}
