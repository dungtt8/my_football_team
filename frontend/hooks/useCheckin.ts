import { useCallback } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

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

export const useCheckin = (): UseCheckinReturn => {
    const getActiveCheckIn = useCallback(async () => {
        const token = localStorage.getItem('auth_token')
        const res = await fetch(`${API_URL}/attendance/checkin/active`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to get active check-in')
        return res.json()
    }, [])

    const respondToCheckIn = useCallback(async (checkInId: number, response: 'yes' | 'no') => {
        const token = localStorage.getItem('auth_token')
        const res = await fetch(`${API_URL}/attendance/checkin/${checkInId}/respond`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ response }),
        })
        if (!res.ok) throw new Error('Failed to respond to check-in')
        return res.json()
    }, [])

    return {
        getActiveCheckIn,
        respondToCheckIn,
    }
}
