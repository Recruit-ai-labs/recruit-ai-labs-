import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/jobs(.*)',
  '/api/webhooks(.*)',
  '/api/inngest(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    // If user is signed in and tries to visit landing or auth pages, redirect to dashboard
    const { userId } = await auth()
    if (userId) {
      const url = request.nextUrl
      // Redirect authenticated users away from landing, sign-in, sign-up
      if (url.pathname === '/' || url.pathname.startsWith('/sign-in') || url.pathname.startsWith('/sign-up')) {
        url.pathname = '/dashboard'
        return Response.redirect(url)
      }
    }
  } else {
    await auth.protect()
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
