import { useCallback, useState } from 'react'
import { apiClient } from '@/lib/api'

// Thin wrapper over the shared apiClient (lib/api.ts) so this hook gets
// consistent auth header injection and 401 handling like the rest of the app.
async function teamFetch<T>(path: string, method: 'GET' | 'PATCH' | 'PUT' = 'GET', body?: any): Promise<T> {
    const res = method === 'GET'
        ? await apiClient.get<T>(path)
        : method === 'PATCH'
            ? await apiClient.patch<T>(path, body)
            : await apiClient.put<T>(path, body)
    if (res.error) throw new Error(res.error || 'Request failed')
    return res.data as T
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
        await teamFetch(`/team/members/${userId}/role`, 'PATCH', { role })
    }, [])

    const deactivateMember = useCallback(async (memberId: number): Promise<void> => {
        await teamFetch(`/team/members/${memberId}/deactivate`, 'PUT')
    }, [])

    const kickMember = useCallback(async (memberId: number): Promise<void> => {
        await teamFetch(`/team/members/${memberId}/kick`, 'PUT')
    }, [])

    return { listMembers, updateMemberRole, deactivateMember, kickMember, loading }
}
