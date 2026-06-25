import { useCallback, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

async function teamFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
}

export interface TeamMember {
    id: number
    full_name: string
    email: string
    phone?: string
    role: 'member' | 'co_manager' | 'owner'
    status: string
    created_at: string
    last_login_at?: string
}

export const useTeam = () => {
    const [loading, setLoading] = useState(false)

    const listMembers = useCallback(async (): Promise<TeamMember[]> => {
        setLoading(true)
        try {
            const res = await teamFetch<{ data: TeamMember[] }>('/team/members')
            return res.data || []
        } finally {
            setLoading(false)
        }
    }, [])

    const updateMemberRole = useCallback(async (userId: number, role: string): Promise<void> => {
        await teamFetch(`/team/members/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        })
    }, [])

    const deactivateMember = useCallback(async (memberId: number): Promise<void> => {
        await teamFetch(`/team/members/${memberId}/deactivate`, {
            method: 'PUT',
        })
    }, [])

    const kickMember = useCallback(async (memberId: number): Promise<void> => {
        await teamFetch(`/team/members/${memberId}/kick`, {
            method: 'PUT',
        })
    }, [])

    return { listMembers, updateMemberRole, deactivateMember, kickMember, loading }
}
