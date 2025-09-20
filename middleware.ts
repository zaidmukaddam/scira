import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const authRoutes = ['/sign-in', '/sign-up'];
const protectedRoutes = ['/lookout', '/xql'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log('Pathname: ', pathname);
  if (pathname === '/api/search') return NextResponse.next();
  if (pathname.startsWith('/new') || pathname.startsWith('/api/search')) {
    return NextResponse.next();
  }

  // /api/payments/webhooks is a webhook endpoint that should be accessible without authentication
  if (pathname.startsWith('/api/payments/webhooks')) {
    return NextResponse.next();
  }

  // /api/auth/polar/webhooks
  if (pathname.startsWith('/api/auth/polar/webhooks')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth/dodopayments/webhooks')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/raycast')) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  // Redirect /settings to /#settings to open settings dialog (only if authenticated)
  if (pathname === '/settings') {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    return NextResponse.redirect(new URL('/#settings', request.url));
  }

  // If user is authenticated but trying to access auth routes
  if (sessionCookie && authRoutes.some((route) => pathname.startsWith(route))) {
    console.log('Redirecting to home');
    console.log('Session cookie: ', sessionCookie);
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!sessionCookie && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
