/**
 * Client-side cookie utilities
 * Used to set/delete auth token in cookies for middleware verification
 */

export function setAuthCookie(token: string) {
    try {
        // Validate token
        if (!token || typeof token !== 'string') {
            console.warn('[CookieUtils] Invalid token provided to setAuthCookie')
            return
        }

        // Set cookie with options:
        // - path=/: Available to all routes
        // - max-age: matches the backend JWT expiry (7d, see backend/src/config/auth.js
        //   `jwtExpiration`). IMPORTANT: keep this in sync with that value — if the
        //   cookie outlives the JWT (or vice versa), the cookie-based middleware check
        //   and the localStorage/AuthContext state can disagree about whether the
        //   session is still valid, causing redirect loops or stale "logged in" UI.
        // - SameSite=Lax: Allow some cross-site cookie usage
        const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds — must match backend JWT expiresIn

        // Build cookie string - encode the token value
        let cookieString = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`

        // Add Secure flag only in production (HTTPS)
        if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
            cookieString += '; Secure'
        }

        document.cookie = cookieString
        console.log('[CookieUtils] Auth cookie set successfully')
    } catch (err) {
        console.error('[CookieUtils] Failed to set auth cookie:', err)
        // Silently fail - localStorage will work as fallback
    }
}

export function deleteAuthCookie() {
    try {
        // Set max-age to 0 to delete the cookie
        document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax'
        console.log('[CookieUtils] Auth cookie deleted successfully')
    } catch (err) {
        console.error('[CookieUtils] Failed to delete auth cookie:', err)
    }
}

export function getAuthCookie(): string | null {
    try {
        const name = 'auth_token='
        const decodedCookie = decodeURIComponent(document.cookie)
        const cookieArray = decodedCookie.split(';')

        for (let cookie of cookieArray) {
            cookie = cookie.trim()
            if (cookie.indexOf(name) === 0) {
                return decodeURIComponent(cookie.substring(name.length))
            }
        }

        return null
    } catch (err) {
        console.error('[CookieUtils] Failed to get auth cookie:', err)
        return null
    }
}
