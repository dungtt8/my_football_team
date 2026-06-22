'use client'

import React from 'react'
import { ApprovalItem } from './ApprovalItem'
import { EmptyState } from '@/components/Common/EmptyState'
import { ListSkeleton } from '@/components/Common/LoadingSkeletons'
import { Approval } from '@/hooks/useFinance'

interface ApprovalQueueProps {
  approvals: Approval[]
  isLoading: boolean
  onApprove: (id: string) => void | Promise<void>
  onReject: (id: string, reason?: string) => void | Promise<void>
  emptyMessage?: string
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  approvals,
  isLoading,
  onApprove,
  onReject,
  emptyMessage = 'No pending approvals',
}) => {
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-md mb-lg">
          <h3 className="text-heading-3 font-bold text-black">Pending Approvals</h3>
          <span className="inline-block px-md py-sm bg-pale-yellow rounded-pill text-caption font-medium">
            {approvals.length} Pending
          </span>
        </div>
        <ListSkeleton count={2} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-md mb-lg">
        <h3 className="text-heading-3 font-bold text-black">Pending Approvals</h3>
        {approvals.length > 0 && (
          <span className="inline-block px-md py-sm bg-pale-yellow rounded-pill text-caption font-medium">
            {approvals.length} Pending
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
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
