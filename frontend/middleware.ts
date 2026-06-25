import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Public routes - no authentication required
    const publicPaths = ['/login', '/auth', '/', '/onboarding/join', '/onboarding/create']
    const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))

    // Protected routes that require authentication
    const protectedPaths = ['/app', '/onboarding']
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

    // Allow public paths
    if (isPublicPath) {
        return NextResponse.next()
    }

    // Only check auth for protected paths
    if (!isProtectedPath) {
        return NextResponse.next()
    }

    // Check if auth token exists in cookies
    const token = request.cookies.get('auth_token')?.value

    // If no token and trying to access protected route, redirect to login
    if (!token) {
        const loginUrl = new URL('/login', request.url)
        // Preserve the original URL so we can redirect back after login
        loginUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public folder)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
    ],
}
