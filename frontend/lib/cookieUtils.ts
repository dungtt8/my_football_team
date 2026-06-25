/**
 * Client-side cookie utilities
 * Used to set/delete auth token in cookies for middleware verification
 */

export function setAuthCookie(token: string) {
    // Set a secure cookie that expires in 7 days
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7)

    document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
}

export function deleteAuthCookie() {
    document.cookie = 'auth_token=; path=/; max-age=0'
}

export function getAuthCookie(): string | null {
    const name = 'auth_token='
    const decodedCookie = decodeURIComponent(document.cookie)
    const cookieArray = decodedCookie.split(';')

    for (let cookie of cookieArray) {
        cookie = cookie.trim()
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length)
        }
    }

    return null
}
