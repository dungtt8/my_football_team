'use client'

import React from 'react'
import { MonthlyFinanceSummary } from '@/hooks/useFinance'

const G = {
    glass: '#FFFFFF',
    glassBorder: '#E7ECF3',
    accent: '#12B76A',
    accentDim: 'rgba(18,183,106,0.12)',
    red: '#F04438',
    redDim: 'rgba(240,68,56,0.12)',
    t1: '#0B1220',
    t2: 'rgba(11,18,32,0.55)',
    t3: 'rgba(11,18,32,0.30)',
}

const fmtMoney = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ'

const monthLabel = (ym: string) => {
    const [, m] = ym.split('-')
    return `T${parseInt(m, 10)}`
}

interface MonthlyFundChartProps {
    data: MonthlyFinanceSummary[]
}

export default function MonthlyFundChart({ data }: MonthlyFundChartProps) {
    const maxValue = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)))
    const barMaxHeight = 120

    return (
        <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                    Thu chi theo tháng
                </p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: G.t3 }}>
                    <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: G.accent, marginRight: 4 }} />Thu</span>
                    <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: G.red, marginRight: 4 }} />Chi</span>
                </div>
            </div>

            {data.length === 0 ? (
                <p style={{ fontSize: '13px', color: G.t3, textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu</p>
            ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: barMaxHeight + 30 }}>
                    {data.map(d => {
                        const incomeH = Math.max(2, Math.round((d.income / maxValue) * barMaxHeight))
                        const expenseH = Math.max(2, Math.round((d.expense / maxValue) * barMaxHeight))
                        return (
                            <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: barMaxHeight }} title={`Thu ${fmtMoney(d.income)} · Chi ${fmtMoney(d.expense)}`}>
                                    <div style={{ width: '9px', height: `${incomeH}px`, borderRadius: '3px 3px 0 0', background: G.accent }} />
                                    <div style={{ width: '9px', height: `${expenseH}px`, borderRadius: '3px 3px 0 0', background: G.red }} />
                                </div>
                                <span style={{ fontSize: '11px', color: G.t3, fontWeight: 600 }}>{monthLabel(d.month)}</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
