import type { ReactNode } from 'react';

// Route group with its own layout, mirroring app/[locale]/(public)/… in the
// app this was found in. interpolateParallelRouteParams walks these.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <section>{children}</section>;
}
