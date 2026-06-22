'use client'

import React from 'react'
import { CampaignApprovalItem } from './CampaignApprovalItem'
import { EmptyState } from '@/components/Common/EmptyState'
import { Campaign } from '@/hooks/useCampaign'

interface CampaignApprovalQueueProps {
  campaigns: Campaign[]
  isLoading: boolean
  onApprove: (id: string) => void
  onReject: (id: string, reason?: string) => void
  emptyMessage?: string
}

export const CampaignApprovalQueue: React.FC<CampaignApprovalQueueProps> = ({
  campaigns,
  isLoading,
  onApprove,
  onReject,
  emptyMessage = 'No pending approvals',
}) => {
  if (isLoading) {
    return (
      <div className="space-y-md">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="p-lg border border-light-gray rounded-lg bg-white animate-pulse"
          >
            <div className="space-y-md">
              <div className="h-6 bg-bone rounded w-3/4"></div>
              <div className="h-4 bg-bone rounded w-full"></div>
              <div className="h-4 bg-bone rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-lg">
        <h2 className="text-lg font-bold text-black">Pending Campaign Approvals</h2>
        <span className="bg-bone px-md py-xs rounded-full text-caption font-medium text-black">
          {campaigns.length}
        </span>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState title={emptyMessage} />
      ) : (
        <div className="space-y-md">
          {campaigns.map((campaign) => (
            <CampaignApprovalItem
              key={campaign.id}
              campaign={campaign}
              onApprove={onApprove}
              onReject={onReject}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
