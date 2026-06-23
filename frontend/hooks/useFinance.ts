'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export interface Transaction {
    id: string
    description: string
    amount: number
    category: string
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string
    submittedBy?: string
    approverInfo?: string
}

export interface Approval {
    id: string
    description: string
    amount: number
    submittedBy: string
    createdAt: string
}

export interface FinanceBalance {
    totalBalance: number
    monthlySpent: number
    pendingCount: number
}

export interface UseFinanceReturn {
    listTransactions: (params?: Record<string, any>) => Promise<Transaction[]>
    getTransactionDetail: (id: string) => Promise<Transaction>
    submitTransaction: (data: any) => Promise<Transaction>
    approveTransaction: (id: string) => Promise<Transaction>
    rejectTransaction: (id: string, reason: string) => Promise<Transaction>
    getPendingApprovals: (params?: Record<string, any>) => Promise<Approval[]>
    getFinanceBalance: () => Promise<FinanceBalance>
    getClosingPeriod: () => Promise<any>
    loading: boolean
    error: Error | null
}

export const useFinance = (): UseFinanceReturn => {
    const { request, loading, error } = useApi()
    const [localError, setLocalError] = useState<Error | null>(null)

    const listTransactions = useCallback(
        async (params?: Record<string, any>) => {
            try {
                setLocalError(null)
                const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
                const data = await request<Transaction[]>(`/finance/transactions${queryString}`, 'GET')
                return data || []
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch transactions')
                setLocalError(error)
                console.error('Error listing transactions:', error)
                return []
            }
        },
        [request]
    )

    const getTransactionDetail = useCallback(
        async (id: string) => {
            try {
                setLocalError(null)
                const data = await request<Transaction>(`/finance/transactions/${id}`, 'GET')
                return data
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch transaction')
                setLocalError(error)
                console.error('Error fetching transaction:', error)
                throw error
            }
        },
        [request]
    )

    const submitTransaction = useCallback(
        async (data: any) => {
            try {
                setLocalError(null)
                const response = await request<Transaction>('/finance/transactions', 'POST', data)
                return response
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to submit transaction')
                setLocalError(error)
                console.error('Error submitting transaction:', error)
                throw error
            }
        },
        [request]
    )

    const approveTransaction = useCallback(
        async (id: string) => {
            try {
                setLocalError(null)
                const response = await request<Transaction>(`/finance/transactions/${id}/approve`, 'PATCH')
                return response
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to approve transaction')
                setLocalError(error)
                console.error('Error approving transaction:', error)
                throw error
            }
        },
        [request]
    )

    const rejectTransaction = useCallback(
        async (id: string, reason: string) => {
            try {
                setLocalError(null)
                const response = await request<Transaction>(
                    `/finance/transactions/${id}/reject`,
                    'PATCH',
                    { rejection_reason: reason }
                )
                return response
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to reject transaction')
                setLocalError(error)
                console.error('Error rejecting transaction:', error)
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
                const data = await request<Approval[]>(`/finance/approvals/pending${queryString}`, 'GET')
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

    const getFinanceBalance = useCallback(
        async () => {
            try {
                setLocalError(null)
                const data = await request<FinanceBalance>('/finance/balance', 'GET')
                return data
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch balance')
                setLocalError(error)
                console.error('Error fetching balance:', error)
                throw error
            }
        },
        [request]
    )

    const getClosingPeriod = useCallback(
        async () => {
            try {
                setLocalError(null)
                const data = await request<any>('/team/finance/closing-period', 'GET')
                return data
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Failed to fetch closing period')
                setLocalError(error)
                console.error('Error fetching closing period:', error)
                throw error
            }
        },
        [request]
    )

    return {
        listTransactions,
        getTransactionDetail,
        submitTransaction,
        approveTransaction,
        rejectTransaction,
        getPendingApprovals,
        getFinanceBalance,
        getClosingPeriod,
        loading,
        error: error || localError,
    }
}
