'use client';

import { notFound, useParams } from 'next/navigation';
import type { ReactNode } from 'react';

const LOCALES = ['en', 'de'];

// Faithful analog of next-international's useCurrentLocale(), which the
// original app calls from a provider in the ROOT layout (its analytics
// identity provider):
//
//   const params = useParams();
//   const segment = params[segmentName];
//   for (const locale of locales) if (segment === locale) return locale;
//   error(`Locale "${segment}" not found ...`);
//   return notFound();
//
// useParams() subscribes this root-level component to router state. When the
// poisoned segment-prefetch tree is applied on click, params.locale becomes
// the first path segment of the DESTINATION (e.g. "deep") — not a valid
// locale — and notFound() is thrown ABOVE every boundary. React tears down
// the entire root: blank page, bare <html>/<body>, URL unchanged, silent
// console. The recovery fetches are cancelled by the unmount, so the state
// that would un-suspend the router never arrives.
export function LocaleGuardProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const segment = params.locale;
  if (typeof segment === 'string' && !LOCALES.includes(segment)) {
    notFound();
  }
  return <>{children}</>;
}
