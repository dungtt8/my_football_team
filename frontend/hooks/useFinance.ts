'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'

// Matches backend `fund_transactions` table (financeHandler.js) — there is no
// `category` column, and field names are snake_case, not camelCase.
export interface Transaction {
    id: string
    team_id?: string
    description: string
    amount: number
    transaction_type?: 'income' | 'expense'
    status: 'pending' | 'approved' | 'rejected'
    bill_image_url?: string | null
    submitted_by?: string
    submitted_by_name?: string
    approved_by?: string | null
    rejected_by?: string | null
    rejection_reason?: string | null
    transaction_date?: string
    created_at?: string
    updated_at?: string
}

// getPendingApprovals hits GET /finance/approvals/pending, which now returns
// fund_transactions rows directly (status = 'pending'), left-joined with the
// submitter's name.
export type Approval = Transaction

export interface FinanceBalance {
    totalBalance: number
    totalIncome: number
    totalExpense: number
    currency: string
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
    getPaymentDeadline: () => Promise<any>
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
                // Backend wraps results as { data, pagination }, not a bare array
                const res = await request<{ data: Transaction[]; pagination: any }>(`/finance/transactions${queryString}`, 'GET')
                return res?.data || []
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
                // Backend wraps results as { data, pagination }, not a bare array
                const res = await request<{ data: Approval[]; pagination: any }>(`/finance/approvals/pending${queryString}`, 'GET')
                return res?.data || []
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
                // Backend returns { team_id, total_balance, total_income, total_expense, currency }
                const data = await request<{ total_balance: number; total_income: number; total_expense: number; currency: string }>('/finance/balance', 'GET')
                if (!data) return data as unknown as FinanceBalance
                return {
                    totalBalance: data.total_balance,
                    totalIncome: data.total_income,
                    totalExpense: data.total_expense,
                    currency: data.currency,
                }
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

    // Alias for semantic clarity
    const getPaymentDeadline = getClosingPeriod

    return {
        listTransactions,
        getTransactionDetail,
        submitTransaction,
        approveTransaction,
        rejectTransaction,
        getPendingApprovals,
        getFinanceBalance,
        getClosingPeriod,
        getPaymentDeadline,
        loading,
        error: error || localError,
    }
}
