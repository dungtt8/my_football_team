import { useCallback } from 'react'
import { useAttendance } from '@/hooks/useAttendance'

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

// Thin wrapper over useAttendance's checkin calls so both hooks share one
// request implementation (auth headers, 401 handling, error state) instead
// of maintaining a second copy of the same /attendance/checkin/* calls.
export const useCheckin = (): UseCheckinReturn => {
    const { getActiveCheckin, respondToCheckin } = useAttendance()

    const getActiveCheckIn = useCallback(async () => {
        const result = await getActiveCheckin()
        return result as unknown as { check_in: ActiveCheckIn | null }
    }, [getActiveCheckin])

    const respondToCheckIn = useCallback(async (checkInId: number, response: 'yes' | 'no') => {
        const result = await respondToCheckin(String(checkInId), response)
        return result as unknown as { success: boolean; check_in: { id: number; response: string; responded_at: string } }
    }, [respondToCheckin])

    return {
        getActiveCheckIn,
        respondToCheckIn,
    }
}
