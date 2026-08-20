export default async function DeepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <main style={{ fontFamily: 'monospace', padding: 40 }}>deep page, locale: {locale}</main>;
}
