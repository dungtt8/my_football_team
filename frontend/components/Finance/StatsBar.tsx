'use client'

import React from 'react'
import { ListSkeleton } from '@/components/Common/LoadingSkeletons'

interface StatsBarProps {
  totalBalance: number
  monthlySpent: number
  pendingCount: number
  isLoading?: boolean
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const StatsBar: React.FC<StatsBarProps> = ({
  totalBalance,
  monthlySpent,
  pendingCount,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="p-xl border border-light-gray rounded-card bg-white"
          >
            <div className="animate-pulse space-y-md">
              <div className="h-4 bg-bone rounded w-2/3"></div>
              <div className="h-6 bg-bone rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Balance',
      value: formatCurrency(totalBalance),
      id: 'total',
    },
    {
      title: 'Monthly Spent',
      value: formatCurrency(monthlySpent),
      id: 'spent',
    },
    {
      title: 'Pending Approvals',
      value: pendingCount.toString(),
      id: 'pending',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="p-xl border border-light-gray rounded-card bg-white hover:bg-bone transition-colors"
        >
          <p className="text-caption text-gray mb-md">{stat.title}</p>
          <p className="text-lg font-bold text-black">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
