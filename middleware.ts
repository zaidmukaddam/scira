import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const authRoutes = ['/sign-in', '/sign-up'];
const protectedRoutes = ['/lookout', '/xql', '/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  // Ensure anonymous client cookie exists for all requests
  const existingAnon = request.cookies.get('arka_client_id')?.value;
  let response = NextResponse.next();
  if (!existingAnon) {
    const anonId = crypto.randomUUID();
    response.cookies.set('arka_client_id', anonId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180, // ~180 days
    });
  }

  // Always allow chat and upload APIs without auth
  if (pathname === '/api/search' || pathname.startsWith('/api/search/') || pathname.startsWith('/api/upload')) {
    return response;
  }

  // Webhooks should be accessible
  if (
    pathname.startsWith('/api/payments/webhooks') ||
    pathname.startsWith('/api/auth/polar/webhooks') ||
    pathname.startsWith('/api/auth/dodopayments/webhooks') ||
    pathname.startsWith('/api/raycast')
  ) {
    return response;
  }

  // Redirect /settings to /#settings to open settings dialog (only if authenticated)
  if (pathname === '/settings' || pathname === '/#settings') {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    return NextResponse.redirect(new URL('/#settings', request.url));
  }

  // If user is authenticated but trying to access auth routes
  if (sessionCookie && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!sessionCookie && protectedRoutes.some((route) => pathname.startsWith(route))) {
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
