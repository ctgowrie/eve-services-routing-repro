export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <main style={{ fontFamily: 'monospace', padding: 40 }}>home, locale: {locale}</main>;
}
