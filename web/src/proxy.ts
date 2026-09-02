import { type NextRequest, NextResponse } from 'next/server';

const LOCALES = ['en', 'de'];

// Mirrors the app this bug was found in: every path except assets/api is
// rewritten into the app/[locale]/… tree, and the resolved locale travels on a
// request header the root layout reads.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathLocale = LOCALES.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  const locale = pathLocale ?? 'en';

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-repro-locale', locale);

  if (pathLocale) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

// Same exclusion shape as the original app: anything with a dot, _next, api,
// eve, static bypasses the proxy.
export const config = {
  matcher: ['/((?!api|eve|static|probe|_next|_vercel|.*\\..*).*)'],
};
