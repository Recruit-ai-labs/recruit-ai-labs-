import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextRequest } from 'next/server'

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Define public routes
  const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks/(.*)',
    '/api/public/(.*)',
    '/jobs(.*)',
    '/interview/(.*)',
  ])

  // If it's a public route, allow access
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // For protected routes, ensure user is authenticated
  const { userId } = await auth()
  
  if (!userId) {
    // Redirect to sign-in page
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect_url', request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
