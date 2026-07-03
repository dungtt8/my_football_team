import { NextRequest, NextResponse } from 'next/server'

// Decode JWT payload and check exp claim (no signature check here -
// the backend already verifies the signature on every API call;
// this is just so routing can redirect expired sessions to login)
function isTokenExpired(token: string): boolean {
    try {
        const payload = token.split('.')[1]
        const decoded = JSON.parse(atob(payload))
        if (!decoded.exp) return false
        return Date.now() >= decoded.exp * 1000
    } catch {
        // Malformed token - treat as expired
        return true
    }
}

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
    // Note: We check cookies first (set by setAuthCookie), then fall back to checking if header exists
    const tokenFromCookie = request.cookies.get('auth_token')?.value
    const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '')
    const token = tokenFromCookie || tokenFromHeader

    // If no token, or token is expired, redirect to login
    if (!token || isTokenExpired(token)) {
        const loginUrl = new URL('/login', request.url)
        // Preserve the original URL so we can redirect back after login
        loginUrl.searchParams.set('from', pathname)
        const response = NextResponse.redirect(loginUrl)
        // Clear stale cookie so it doesn't keep bouncing through this check
        response.cookies.delete('auth_token')
        return response
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
