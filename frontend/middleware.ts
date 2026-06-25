import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Protected routes that require authentication
    const protectedPaths = [
        '/app',
        '/onboarding', // Onboarding also requires login first
    ]

    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

    if (!isProtectedPath) {
        return NextResponse.next()
    }

    // Check if auth token exists
    const token = request.cookies.get('auth_token')?.value ||
        request.headers.get('authorization')?.replace('Bearer ', '')

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
