// Two locale-less path segments, like /exam-preps/create in the original app.
// The mangled segment-prefetch for /deep/create resolves through the catch-all
// as locale="deep", rest=["create"] — a parseable flight payload carrying the
// WRONG router tree, which the segment cache happily stores.
export default async function DeepCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <main style={{ fontFamily: 'monospace', padding: 40 }}>deep/create, locale: {locale}</main>;
}
