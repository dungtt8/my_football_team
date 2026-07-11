'use client'

import React from 'react'

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

const STAT_CONFIG = [
    {
        id: 'total',
        title: 'Tổng số dư',
        accent: '#027A48',
        accentBg: 'rgba(61, 90, 80, 0.06)',
        icon: '💰',
    },
    {
        id: 'spent',
        title: 'Chi tiêu tháng này',
        accent: '#F04438',
        accentBg: 'rgba(214, 69, 69, 0.06)',
        icon: '📉',
    },
    {
        id: 'pending',
        title: 'Chờ duyệt',
        accent: '#F5A623',
        accentBg: 'rgba(232, 179, 75, 0.06)',
        icon: '⏳',
    },
]

export const StatsBar: React.FC<StatsBarProps> = ({
    totalBalance,
    monthlySpent,
    pendingCount,
    isLoading = false,
}) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div
                        key={index}
                        className="p-5 rounded-2xl animate-pulse"
                        style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(15, 14, 12, 0.06)' }}
                    >
                        <div className="space-y-3">
                            <div className="h-3 bg-slate-100 rounded-full w-1/2" />
                            <div className="h-7 bg-slate-100 rounded-full w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const values = [
        formatCurrency(totalBalance),
        formatCurrency(monthlySpent),
        pendingCount.toString(),
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STAT_CONFIG.map((stat, i) => (
                <div
                    key={stat.id}
                    className="relative p-7 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                        background: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(15, 14, 12, 0.06), 0 0 0 1px rgba(15, 14, 12, 0.04)',
                    }}
                >
                    {/* Accent bar top */}
                    <div
                        className="absolute top-0 left-5 right-5 h-0.5 rounded-b-full"
                        style={{ background: stat.accent, opacity: 0.6 }}
                    />

                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#7A8699' }}>
                                {stat.title}
                            </p>
                            <p className="text-2xl font-serif font-light" style={{ color: '#0B1220' }}>
                                {values[i]}
                            </p>
                        </div>
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                            style={{ background: stat.accentBg }}
                        >
                            {stat.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
