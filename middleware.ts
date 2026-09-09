import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const VISITOR_COOKIE_NAME = 'visitor_id';

export function middleware(request: NextRequest) {
  // Ignore static assets, images, and internal Next.js requests
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/_') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const existingVisitorId = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  const visitorId = existingVisitorId || crypto.randomUUID();

  // Clone the request headers and inject our visitor ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-visitor-id', visitorId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // If visitor didn't have a cookie, issue one that persists for 1 year
  if (!existingVisitorId) {
    response.cookies.set({
      name: VISITOR_COOKIE_NAME,
      value: visitorId,
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      httpOnly: false, // Accessible to client store as well
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
