// Full-page view: what a cold load (or hard navigation) of
// /[locale]/lab/[slug] renders.
export default async function LabAppPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return (
    <main style={{ fontFamily: 'monospace', padding: 40 }} data-testid="lab-app-full-page">
      full page — app: {slug}, locale: {locale}
    </main>
  );
}
