'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export interface Campaign {
  id: string
  title: string
  description: string
  type: string
  status: 'draft' | 'active' | 'ended' | 'pending_approval'
  startDate: string
  endDate: string
  targetAudience: string
  participantCount: number
  createdBy?: string
  createdDate?: string
  notes?: string
}

export interface CampaignApproval {
  id: string
  title: string
  description: string
  createdBy: string
  createdDate: string
}

export interface CampaignStats {
  totalCampaigns: number
  activeCampaigns: number
  totalParticipants: number
}

export interface UseCampaignReturn {
  listCampaigns: (params?: Record<string, any>) => Promise<Campaign[]>
  getCampaignDetail: (id: string) => Promise<Campaign>
  createCampaign: (data: any) => Promise<Campaign>
  updateCampaign: (id: string, data: any) => Promise<Campaign>
  deleteCampaign: (id: string) => Promise<boolean>
  getPendingApprovals: (params?: Record<string, any>) => Promise<CampaignApproval[]>
  approveCampaign: (id: string) => Promise<Campaign>
  loading: boolean
  error: Error | null
}

export const useCampaign = (): UseCampaignReturn => {
  const { request, loading, error } = useApi()
  const [localError, setLocalError] = useState<Error | null>(null)

  const listCampaigns = useCallback(
    async (params?: Record<string, any>) => {
      try {
        setLocalError(null)
        const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
        const data = await request<Campaign[]>(`/campaigns${queryString}`, 'GET')
        return data || []
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch campaigns')
        setLocalError(error)
        console.error('Error listing campaigns:', error)
        return []
      }
    },
    [request]
  )

  const getCampaignDetail = useCallback(
    async (id: string) => {
      try {
        setLocalError(null)
        const data = await request<Campaign>(`/campaigns/${id}`, 'GET')
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch campaign')
        setLocalError(error)
        console.error('Error fetching campaign:', error)
        throw error
      }
    },
    [request]
  )

  const createCampaign = useCallback(
    async (data: any) => {
      try {
        setLocalError(null)
        const response = await request<Campaign>('/campaigns', 'POST', data)
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create campaign')
        setLocalError(error)
        console.error('Error creating campaign:', error)
        throw error
      }
    },
    [request]
  )

  const updateCampaign = useCallback(
    async (id: string, data: any) => {
      try {
        setLocalError(null)
        const response = await request<Campaign>(`/campaigns/${id}`, 'PUT', data)
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update campaign')
        setLocalError(error)
        console.error('Error updating campaign:', error)
        throw error
      }
    },
    [request]
  )

  const deleteCampaign = useCallback(
    async (id: string) => {
      try {
        setLocalError(null)
        await request<void>(`/campaigns/${id}`, 'DELETE')
        return true
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete campaign')
        setLocalError(error)
        console.error('Error deleting campaign:', error)
        throw error
      }
    },
    [request]
  )

  const getPendingApprovals = useCallback(
    async (params?: Record<string, any>) => {
      try {
        setLocalError(null)
        const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
        const data = await request<CampaignApproval[]>(`/campaigns/approvals/pending${queryString}`, 'GET')
        return data || []
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch pending approvals')
        setLocalError(error)
        console.error('Error fetching pending approvals:', error)
        return []
      }
    },
    [request]
  )

  const approveCampaign = useCallback(
    async (id: string) => {
      try {
        setLocalError(null)
        const response = await request<Campaign>(`/campaigns/${id}/approve`, 'POST')
        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to approve campaign')
        setLocalError(error)
        console.error('Error approving campaign:', error)
        throw error
      }
    },
    [request]
  )

  return {
    listCampaigns,
    getCampaignDetail,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getPendingApprovals,
    approveCampaign,
    loading,
    error: error || localError,
  }
}
