// Catch-all under the dynamic locale segment, as in the app this was found
// in. The mangled segment-prefetch path gets absorbed here.
export default async function RestPage({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale, rest } = await params;
  return (
    <main style={{ fontFamily: 'monospace', padding: 40 }}>
      rest page — locale: {locale}, rest: {rest.join('/')}
    </main>
  );
}
