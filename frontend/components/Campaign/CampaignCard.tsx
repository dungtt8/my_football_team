'use client'

import React from 'react'
import { Badge } from '@/components/Common/Badge'
import { Button } from '@/components/Common/Button'
import { Campaign } from '@/hooks/useCampaign'

interface CampaignCardProps {
  campaign: Campaign
  onClick?: (id: string) => void
  isLoading?: boolean
}

const getStatusColor = (status: string): 'approved' | 'pending' | 'rejected' | 'info' => {
  switch (status) {
    case 'active':
      return 'approved'
    case 'ended':
      return 'rejected'
    case 'pending_approval':
      return 'pending'
    case 'draft':
      return 'info'
    default:
      return 'info'
  }
}

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
  campaign,
  onClick,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="p-lg border border-light-gray rounded-lg bg-white animate-pulse">
        <div className="space-y-md">
          <div className="h-6 bg-bone rounded w-3/4"></div>
          <div className="h-4 bg-bone rounded w-full"></div>
          <div className="h-4 bg-bone rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-lg border border-light-gray rounded-lg bg-white hover:bg-bone transition-colors cursor-pointer"
      onClick={() => onClick?.(campaign.id)}
    >
      <div className="flex items-start justify-between mb-md">
        <h3 className="text-lg font-bold text-black flex-1">{campaign.title}</h3>
        <Badge variant={getStatusColor(campaign.status)}>
          {campaign.status.replace('_', ' ')}
        </Badge>
      </div>

      <p className="text-body text-gray mb-md line-clamp-2">{campaign.description}</p>

      <div className="flex items-center justify-between mb-md">
        <p className="text-caption text-gray">
          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-caption text-gray">{campaign.participantCount} participants</p>
        <Button onClick={() => onClick?.(campaign.id)} size="sm" variant="secondary">
          View
        </Button>
      </div>
    </div>
  )
}
