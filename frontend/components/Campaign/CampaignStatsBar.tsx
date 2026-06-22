'use client'

import React from 'react'

interface CampaignStatsBarProps {
  totalCampaigns: number
  activeCampaigns: number
  totalParticipants: number
  isLoading?: boolean
}

export const CampaignStatsBar: React.FC<CampaignStatsBarProps> = ({
  totalCampaigns,
  activeCampaigns,
  totalParticipants,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="p-md border border-light-gray rounded-lg bg-bone"
          >
            <div className="animate-pulse space-y-md">
              <div className="h-4 bg-light-gray rounded w-2/3"></div>
              <div className="h-6 bg-light-gray rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Campaigns',
      value: totalCampaigns.toString(),
      id: 'total',
    },
    {
      title: 'Active Campaigns',
      value: activeCampaigns.toString(),
      id: 'active',
    },
    {
      title: 'Total Participants',
      value: totalParticipants.toString(),
      id: 'participants',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="p-md border border-light-gray rounded-lg bg-bone hover:bg-white transition-colors"
        >
          <p className="text-caption text-gray mb-md">{stat.title}</p>
          <p className="text-lg font-bold text-black">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
