'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'

// Matches backend `campaigns` table
export interface Campaign {
    id: string
    team_id?: string
    name: string                  // backend uses `name`, not `title`
    amount_per_member: number
    deadline?: string | null
    description?: string | null
    status: 'active' | 'closed'
    created_by?: string
    created_at?: string
    updated_at?: string
    campaign_type?: 'general' | 'team_fund'
    fund_month?: string | null // YYYY-MM, only set for campaign_type: 'team_fund'
    assignments?: CampaignAssignment[]
}

// Matches backend `campaign_assignments` table
export interface CampaignAssignment {
    id?: string
    campaign_id: string
    user_id: string
    // Real values set by backend/campaignHandler.js — note it's "pending_approval"
    // (not "confirmed") after a member confirms, and "exempt" (not "exempted").
    status: 'pending_confirmation' | 'pending_approval' | 'approved' | 'rejected' | 'exempt'
    bill_image_url?: string | null
    created_at?: string
    updated_at?: string
    full_name?: string
    phone?: string
    avatar_url?: string
}

export interface CampaignReport {
    campaign_id: string
    total_members: number
    confirmed: number
    rejected: number
    approved: number
    exempted: number
    pending: number
    collected_amount: number
    expected_amount: number
}

export interface UseCampaignReturn {
    listCampaigns: (params?: { status?: string; limit?: number; offset?: number }) => Promise<Campaign[]>
    getCampaign: (id: string) => Promise<Campaign>
    createCampaign: (data: { name: string; amount_per_member: number; deadline?: string; description?: string }) => Promise<Campaign>
    uploadBillImage: (file: File) => Promise<string>
    memberConfirm: (campaignId: string, userId: string, billImageUrl: string) => Promise<CampaignAssignment>
    memberReject: (campaignId: string, userId: string) => Promise<CampaignAssignment>
    coManagerApprove: (campaignId: string, userId: string) => Promise<CampaignAssignment>
    coManagerReject: (campaignId: string, userId: string) => Promise<CampaignAssignment>
    coManagerExempt: (campaignId: string, userId: string) => Promise<CampaignAssignment>
    closeCampaign: (id: string) => Promise<Campaign>
    getReport: (id: string) => Promise<CampaignReport>
    loading: boolean
    error: Error | null
}

export const useCampaign = (): UseCampaignReturn => {
    const { request, loading, error } = useApi()
    const [localError, setLocalError] = useState<Error | null>(null)

    const listCampaigns = useCallback(
        async (params?: { status?: string; limit?: number; offset?: number }) => {
            try {
                setLocalError(null)
                const entries = params
                    ? Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)] as [string, string])
                    : []
                const queryString = entries.length ? `?${new URLSearchParams(entries).toString()}` : ''
                const data = await request<Campaign[]>(`/campaigns${queryString}`, 'GET')
                return data || []
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch campaigns')
                setLocalError(error)
                return []
            }
        },
        [request]
    )

    const getCampaign = useCallback(
        async (id: string) => {
            try {
                setLocalError(null)
                return await request<Campaign>(`/campaigns/${id}`, 'GET')
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch campaign')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    const createCampaign = useCallback(
        async (data: { name: string; amount_per_member: number; deadline?: string; description?: string }) => {
            try {
                setLocalError(null)
                return await request<Campaign>('/campaigns', 'POST', data)
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to create campaign')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    // Uploads the payment proof image from the member's device and returns its public URL.
    // Uses a raw fetch (not the shared `request` helper) because this is a
    // multipart/form-data upload, not JSON.
    const uploadBillImage = useCallback(async (file: File) => {
        try {
            setLocalError(null)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
            const formData = new FormData()
            formData.append('bill_image', file)

            const res = await fetch(`${apiUrl}/campaigns/bill-image/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
                },
            })

            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                throw new Error(data.error || 'Failed to upload bill image')
            }
            return data.url as string
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to upload bill image')
            setLocalError(error)
            throw error
        }
    }, [])

    const memberConfirm = useCallback(
        async (campaignId: string, userId: string, billImageUrl: string) => {
            try {
                setLocalError(null)
                return await request<CampaignAssignment>(
                    `/campaigns/${campaignId}/assignments/${userId}/confirm`,
                    'POST',
                    { bill_image_url: billImageUrl }
                )
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to confirm campaign')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    const memberReject = useCallback(
        async (campaignId: string, userId: string) => {
            try {
                setLocalError(null)
                return await request<CampaignAssignment>(`/campaigns/${campaignId}/assignments/${userId}/reject`, 'POST')
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to reject campaign')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    const coManagerApprove = useCallback(
        async (campaignId: string, userId: string) => {
            try {
                setLocalError(null)
                return await request<CampaignAssignment>(`/campaigns/${campaignId}/assignments/${userId}/approve`, 'PATCH')
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to approve assignment')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    const coManagerReject = useCallback(
        async (campaignId: string, userId: string) => {
            try {
                setLocalError(null)
                return await request<CampaignAssignment>(`/campaigns/${campaignId}/assignments/${userId}/reject`, 'PATCH')
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to reject assignment')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    const coManagerExempt = useCallback(
        async (campaignId: string, userId: string) => {
            try {
                setLocalError(null)
                return await request<CampaignAssignment>(`/campaigns/${campaignId}/assignments/${userId}/exempt`, 'PATCH')
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to exempt member')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    const closeCampaign = useCallback(
        async (id: string) => {
            try {
                setLocalError(null)
                return await request<Campaign>(`/campaigns/${id}/close`, 'POST')
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to close campaign')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    const getReport = useCallback(
        async (id: string) => {
            try {
                setLocalError(null)
                return await request<CampaignReport>(`/campaigns/${id}/report`, 'GET')
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch report')
                setLocalError(error)
                throw error
            }
        },
        [request]
    )

    return {
        listCampaigns,
        getCampaign,
        createCampaign,
        uploadBillImage,
        memberConfirm,
        memberReject,
        coManagerApprove,
        coManagerReject,
        coManagerExempt,
        closeCampaign,
        getReport,
        loading,
        error: error || localError,
    }
}
