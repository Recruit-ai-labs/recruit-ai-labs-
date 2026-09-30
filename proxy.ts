import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/candidate(.*)', '/assessment(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname === '/') {
    const { userId } = await auth();
    if (userId) return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  // The opaque access cookie is checked in server guards; this only lets those guards route visitors.
  if (request.nextUrl.pathname.startsWith('/dashboard') && request.cookies.has('recruit-access')) return;
  if (isProtectedRoute(request)) await auth.protect();
});

export const config = { matcher: ['/((?!_next|.*\\..*).*)', '/'] };
