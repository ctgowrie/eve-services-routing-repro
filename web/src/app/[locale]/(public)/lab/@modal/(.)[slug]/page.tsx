// The interception target: a soft navigation from the catalog renders the
// app here, as a modal over the catalog. This is the element the reproduction
// asserts on — on a broken deployment it never mounts.
export default async function LabAppModal({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return (
    <div
      data-testid="lab-app-modal"
      style={{
        position: 'fixed',
        inset: '10% 20%',
        background: '#111',
        color: '#7ee2a8',
        border: '2px solid #1c7a42',
        borderRadius: 12,
        padding: 40,
        fontFamily: 'monospace',
      }}>
      MODAL MOUNTED — app: {slug}, locale: {locale}
    </div>
  );
}
