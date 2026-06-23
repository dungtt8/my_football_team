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

export class ApiClient {
    private baseUrl: string

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl
    }

    private getAuthHeader(): HeadersInit {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
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
        const headers = {
            ...this.getAuthHeader(),
            ...options.headers,
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
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
