import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/jobs(.*)',
  '/interview/(.*)',
  '/api/public(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    // If user is signed in and tries to visit landing or auth pages, redirect to dashboard
    try {
      const { userId } = await auth()
      if (userId) {
        const url = request.nextUrl
        // Redirect authenticated users away from landing, sign-in, sign-up
        if (url.pathname === '/' || url.pathname.startsWith('/sign-in') || url.pathname.startsWith('/sign-up')) {
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
      }
    } catch (error) {
      console.warn('Clerk auth check failed, allowing public access', error)
      // Allow public route access even if Clerk fails
      return NextResponse.next()
    }
  } else {
    try {
      await auth.protect()
    } catch (error) {
      console.warn('Clerk auth failed, redirecting to sign-in', error)
      const url = request.nextUrl
      url.pathname = '/sign-in'
      return NextResponse.redirect(url)
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
