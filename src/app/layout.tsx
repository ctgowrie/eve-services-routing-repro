import { headers } from 'next/headers';
import { LocaleGuardProvider } from './locale-guard';
import type { ReactNode } from 'react';

// Mirrors the app this bug was found in: the root layout reads a request
// header (set by the proxy), which makes the ENTIRE tree dynamic — no
// prerendered .segments artifacts exist anywhere.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await headers()).get('x-repro-locale') ?? 'en';
  return (
    <html lang={locale}>
      <body><LocaleGuardProvider>{children}</LocaleGuardProvider></body>
    </html>
  );
}
