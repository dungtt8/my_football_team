'use client'

import React from 'react'
import { TransactionItem } from './TransactionItem'
import { EmptyState } from '@/components/Common/EmptyState'
import { ListSkeleton } from '@/components/Common/LoadingSkeletons'
import { Transaction } from '@/hooks/useFinance'

interface TransactionListProps {
    transactions: Transaction[]
    isLoading: boolean
    onItemClick?: (id: string) => void
    emptyMessage?: string
    showApprovalButtons?: boolean
    onApprove?: (id: string) => void
    onReject?: (id: string) => void
}

export const TransactionList: React.FC<TransactionListProps> = ({
    transactions,
    isLoading,
    onItemClick,
    emptyMessage = 'No transactions found',
    showApprovalButtons = false,
    onApprove,
    onReject,
}) => {
    if (isLoading) {
        return <ListSkeleton count={4} />
    }

    if (transactions.length === 0) {
        return <EmptyState title={emptyMessage} icon="📋" />
    }

    return (
        <div className="space-y-4">
            {transactions.map((transaction) => (
                <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    onClick={onItemClick}
                    showApprovalButtons={showApprovalButtons}
                    onApprove={onApprove}
                    onReject={onReject}
                />
            ))}
        </div>
    )
}
