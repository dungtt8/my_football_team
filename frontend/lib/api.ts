/**
 * API Client
 * Handles base API configuration, auth header injection, and error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface ApiResponse<T> {
    data?: T
    error?: string
    status: number
}

interface ApiError extends Error {
    status: number
    data?: any
}

// Module-level flag so we only ever trigger one forced logout/redirect,
// even if several in-flight requests all receive a 401 around the same time.
let hasRedirectedToLogin = false

export class ApiClient {
    private baseUrl: string

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl
    }

    private getCurrentToken(): string | null {
        return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    }

    private getAuthHeader(token: string | null): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }

        return headers
    }

    async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`
        // Capture the token used for *this* request so that if it 401s, we can
        // later check whether the token has since been rotated (e.g. by a
        // concurrent switchTeam refresh) before reacting to the 401.
        const requestToken = this.getCurrentToken()
        const headers = {
            ...this.getAuthHeader(requestToken),
            ...options.headers,
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                if (response.status === 401) {
                    this.handleUnauthorized(requestToken)
                }

                const error = new Error(data.error || `API Error: ${response.status}`) as ApiError
                error.status = response.status
                error.data = data
                throw error
            }

            return {
                data: data as T,
                status: response.status,
            }
        } catch (error) {
            const apiError = error as ApiError
            console.error(`[API Error] ${endpoint}:`, apiError)

            return {
                error: apiError.message || 'Failed to fetch',
                status: apiError.status || 500,
            }
        }
    }

    // Session expired or invalid token: clear stored auth and send user to login.
    // `requestToken` is whatever token was sent with the now-failed request. If the
    // token currently in storage is different, it was rotated after this request was
    // sent (e.g. by switchTeam finishing in the meantime) — that means this 401 is
    // stale/racy and must NOT trigger a logout of an otherwise-valid new session.
    private handleUnauthorized(requestToken: string | null) {
        if (typeof window === 'undefined') return

        const currentToken = this.getCurrentToken()
        if (requestToken !== currentToken) {
            // Stale request racing a token refresh — ignore.
            return
        }

        // Only ever act once, even if multiple in-flight requests 401 together.
        if (hasRedirectedToLogin) return
        hasRedirectedToLogin = true

        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        localStorage.removeItem('team')
        localStorage.removeItem('role')
        localStorage.removeItem('allTeams')
        document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Lax'

        // Avoid redirect loop if already on login page
        if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/login/')) {
            const from = encodeURIComponent(window.location.pathname)
            window.location.href = `/login?from=${from}`
        }
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'GET' })
    }

    async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        })
    }

    async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        })
    }

    async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        })
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' })
    }
}

export const apiClient = new ApiClient()
