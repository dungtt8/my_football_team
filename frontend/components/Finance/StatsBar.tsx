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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="p-6 rounded-xl animate-pulse"
            style={{ background: '#FFFFFF', boxShadow: '0 6px 16px rgba(15, 14, 12, 0.10)' }}
          >
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const stats = [
    {
      title: 'Tổng số dư',
      value: formatCurrency(totalBalance),
      id: 'total',
    },
    {
      title: 'Chi tiêu hàng tháng',
      value: formatCurrency(monthlySpent),
      id: 'spent',
    },
    {
      title: 'Chờ duyệt',
      value: pendingCount.toString(),
      id: 'pending',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="p-6 rounded-xl transition-all duration-300 hover:shadow-lg"
          style={{ background: '#FFFFFF', boxShadow: '0 6px 16px rgba(15, 14, 12, 0.10)' }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: '#9F9A93' }}>{stat.title}</p>
          <p className="text-2xl font-serif font-light" style={{ color: '#0F0E0C' }}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
