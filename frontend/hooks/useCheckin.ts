import { useCallback } from 'react'
import { apiClient } from '@/lib/api'

export interface ActiveCheckIn {
    id: number
    session_time: string
    session_location: string
    session_type: string
    response: 'yes' | 'no' | null
    responded_at: string | null
}

interface UseCheckinReturn {
    getActiveCheckIn: () => Promise<{ check_in: ActiveCheckIn | null }>
    respondToCheckIn: (checkInId: number, response: 'yes' | 'no') => Promise<{ success: boolean; check_in: { id: number; response: string; responded_at: string } }>
}

// Uses the shared apiClient (lib/api.ts) instead of raw fetch so auth headers
// and 401 handling are consistent with the rest of the app.
export const useCheckin = (): UseCheckinReturn => {
    const getActiveCheckIn = useCallback(async () => {
        const res = await apiClient.get<{ check_in: ActiveCheckIn | null }>('/attendance/checkin/active')
        if (res.error || !res.data) throw new Error(res.error || 'Failed to get active check-in')
        return res.data
    }, [])

    const respondToCheckIn = useCallback(async (checkInId: number, response: 'yes' | 'no') => {
        const res = await apiClient.post<{ success: boolean; check_in: { id: number; response: string; responded_at: string } }>(
            `/attendance/checkin/${checkInId}/respond`,
            { response }
        )
        if (res.error || !res.data) throw new Error(res.error || 'Failed to respond to check-in')
        return res.data
    }, [])

    return {
        getActiveCheckIn,
        respondToCheckIn,
    }
}
