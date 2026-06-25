/**
 * Client-side cookie utilities
 * Used to set/delete auth token in cookies for middleware verification
 */

export function setAuthCookie(token: string) {
    // Set cookie with options:
    // - path=/: Available to all routes
    // - max-age: 7 days in seconds
    // - SameSite=Strict: Strict same-site policy for security
    const maxAge = 7 * 24 * 60 * 60 // 7 days in seconds

    // Build cookie string
    let cookieString = `auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Strict`

    // Add Secure flag only in production (HTTPS)
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        cookieString += '; Secure'
    }

    document.cookie = cookieString
}

export function deleteAuthCookie() {
    // Set max-age to 0 to delete the cookie
    document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Strict'
}

export function getAuthCookie(): string | null {
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
}
