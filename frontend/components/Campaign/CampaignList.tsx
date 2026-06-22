'use client'

import React from 'react'
import { CampaignCard } from './CampaignCard'
import { EmptyState } from '@/components/Common/EmptyState'
import { Campaign } from '@/hooks/useCampaign'

interface CampaignListProps {
  campaigns: Campaign[]
  isLoading: boolean
  onItemClick?: (id: string) => void
  emptyMessage?: string
  viewMode?: 'grid' | 'list'
}

export const CampaignList: React.FC<CampaignListProps> = ({
  campaigns,
  isLoading,
  onItemClick,
  emptyMessage = 'No campaigns found',
  viewMode = 'grid',
}) => {
  if (isLoading) {
    return (
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-md'
            : 'space-y-md'
        }
      >
        {Array.from({ length: 4 }).map((_, index) => (
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

  if (campaigns.length === 0) {
    return <EmptyState title={emptyMessage} />
  }

  return (
    <div
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 gap-md'
          : 'space-y-md'
      }
    >
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          onClick={onItemClick}
        />
      ))}
    </div>
  )
}
