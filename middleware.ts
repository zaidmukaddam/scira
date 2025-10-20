import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/local-session';

const authRoutes = ['/sign-in', '/sign-up'];
const protectedRoutes = ['/lookout', '/xql', '/settings'];
const adminApiRoutes = ['/api/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('local.session')?.value || null;
  let session;
  try {
    session = verifySessionToken(token);

  } catch {

    session = null;
  }

  // Guest sessions disabled: do not create arka_client_id cookie
  let response = NextResponse.next();

  if (pathname === '/api/search' || pathname.startsWith('/api/search/') || pathname.startsWith('/api/upload')) {
    return response;
  }

  if (
    pathname.startsWith('/api/payments/webhooks') ||
    pathname.startsWith('/api/auth/polar/webhooks') ||
    pathname.startsWith('/api/auth/dodopayments/webhooks') ||
    pathname.startsWith('/api/raycast')
  ) {
    return response;
  }

  if (pathname === '/settings' || pathname === '/#settings') {
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    return NextResponse.redirect(new URL('/#settings', request.url));
  }

  if (session && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!session && (protectedRoutes.some((route) => pathname.startsWith(route)) || adminApiRoutes.some((route) => pathname.startsWith(route)))) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
