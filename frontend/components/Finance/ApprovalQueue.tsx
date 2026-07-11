'use client'

import React, { useState } from 'react'
import { ApprovalItem } from './ApprovalItem'
import { EmptyState } from '@/components/Common/EmptyState'
import { ListSkeleton } from '@/components/Common/LoadingSkeletons'
import { Approval } from '@/hooks/useFinance'

interface ApprovalQueueProps {
    approvals: Approval[]
    isLoading: boolean
    onApprove: (id: string) => void | Promise<void>
    onReject: (id: string, reason: string) => void | Promise<void>
    emptyMessage?: string
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
    approvals,
    isLoading,
    onApprove,
    onReject,
    emptyMessage = 'Không có yêu cầu duyệt',
}) => {
    // Track which approval is currently being processed to prevent double-submit
    const [processingId, setProcessingId] = useState<string | null>(null)

    const handleApprove = async (id: string) => {
        if (processingId) return
        setProcessingId(id)
        try {
            await onApprove(id)
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (id: string, reason: string) => {
        if (processingId) return
        setProcessingId(id)
        try {
            await onReject(id, reason)
        } finally {
            setProcessingId(null)
        }
    }

    if (isLoading) {
        return (
            <div>
                <div className="flex items-center gap-md mb-lg">
                    <h3 className="text-base font-semibold" style={{ color: '#0B1220' }}>Chờ duyệt</h3>
                    <span className="inline-block px-md py-sm bg-pale-yellow rounded-pill text-caption font-medium">
                        {approvals.length} Chờ duyệt
                    </span>
                </div>
                <ListSkeleton count={2} />
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center gap-md mb-lg">
                <h3 className="text-base font-semibold" style={{ color: '#0B1220' }}>Chờ duyệt</h3>
                {approvals.length > 0 && (
                    <span className="inline-block px-md py-sm bg-pale-yellow rounded-pill text-caption font-medium">
                        {approvals.length} Chờ duyệt
                    </span>
                )}
            </div>

            {approvals.length === 0 ? (
                <EmptyState title={emptyMessage} icon="✅" />
            ) : (
                <div className="space-y-lg">
                    {approvals.map((approval) => (
                        <ApprovalItem
                            key={approval.id}
                            approval={approval}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            isLoading={processingId === approval.id}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
