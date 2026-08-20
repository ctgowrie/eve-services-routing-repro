import Link from 'next/link';

const APPS = ['sudoku', 'fifteen-puzzle', 'encyclopedia'];

// The catalog. Clicking a card is the reproduction: on a healthy deployment
// the app opens in a modal over this page; on a broken one the URL changes
// and nothing else happens (the modal never mounts, the router loops
// re-prefetching).
export default async function LabCatalog({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main style={{ fontFamily: 'monospace', padding: 40 }}>
      <h1>Lab catalog — locale: {locale}</h1>
      <p>
        Click a card. Healthy: it opens in a modal over this page. Broken: the
        URL changes and nothing happens.
      </p>
      <ul>
        {APPS.map((slug) => (
          <li key={slug} style={{ margin: '8px 0' }}>
            <Link href={`/${locale}/lab/${slug}`} data-testid={`lab-card-${slug}`}>
              open {slug}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
