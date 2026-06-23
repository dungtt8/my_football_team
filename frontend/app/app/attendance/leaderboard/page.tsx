'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, LeaderboardEntry } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft, CaretLeft, CaretRight } from 'phosphor-react'

const G = {
    bg: '#070B14', glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)', blue: '#4A7CFF',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
}

export default function LeaderboardPage() {
    const router = useRouter()
    const { user } = useAuth()
    const { toast } = useToast()
    const { getLeaderboard, getHistoricalLeaderboard } = useAttendance()

    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [currentMonth, setCurrentMonth] = useState<string>(() => {
        const now = new Date()
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    })
    const [userRank, setUserRank] = useState<number | null>(null)
    const [userPoints, setUserPoints] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loadLeaderboard = useCallback(async () => {
        setIsLoading(true)
        try {
            let data
            const now = new Date()
            const yearMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')

            if (currentMonth === yearMonth) {
                data = await getLeaderboard()
            } else {
                data = await getHistoricalLeaderboard(currentMonth)
            }

            setEntries(data || [])

            // Find current user's rank and points
            if (user?.id && data) {
                const userEntry = data.find(e => (e.user_id || e.userId) === user.id)
                if (userEntry) {
                    const rank = data.indexOf(userEntry) + 1
                    setUserRank(rank)
                    setUserPoints(userEntry.total_points ?? userEntry.points ?? 0)
                }
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error)
            toast('Failed to load leaderboard', 'error')
        } finally {
            setIsLoading(false)
        }
    }, [currentMonth, getLeaderboard, getHistoricalLeaderboard, toast, user?.id])

    // Load leaderboard when month changes
    useEffect(() => {
        if (!currentMonth) return
        loadLeaderboard()
    }, [currentMonth, loadLeaderboard])

    const goToPreviousMonth = () => {
        const [year, month] = currentMonth.split('-')
        let m = parseInt(month) - 1
        let y = parseInt(year)
        if (m < 1) {
            m = 12
            y -= 1
        }
        setCurrentMonth(`${y}-${String(m).padStart(2, '0')}`)
    }

    const goToNextMonth = () => {
        const now = new Date()
        const currentYearMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')

        // Don't allow going beyond current month
        if (currentMonth === currentYearMonth) return

        const [year, month] = currentMonth.split('-')
        let m = parseInt(month) + 1
        let y = parseInt(year)
        if (m > 12) {
            m = 1
            y += 1
        }
        const nextMonth = `${y}-${String(m).padStart(2, '0')}`

        // Only allow if not beyond current month
        if (nextMonth <= currentYearMonth) {
            setCurrentMonth(nextMonth)
        }
    }

    const formatMonthDisplay = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    }

    const canGoNext = () => {
        const now = new Date()
        const currentYearMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
        return currentMonth < currentYearMonth
    }

    return (
        <div style={{ background: G.bg, minHeight: '100vh', padding: '16px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => router.back()} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.t1,
                    }}>
                        <ArrowLeft size={20} weight="bold" />
                    </button>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: G.t1 }}>Bảng xếp hạng</h1>
                </div>
            </div>

            {/* Month Navigation */}
            <div style={{
                background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '14px',
                padding: '14px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', backdropFilter: 'blur(12px)',
            }}>
                <button onClick={goToPreviousMonth} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.t2,
                }}>
                    <CaretLeft size={18} weight="bold" />
                </button>
                <span style={{ fontSize: '14px', fontWeight: 600, color: G.t1, minWidth: '150px', textAlign: 'center' }}>
                    {formatMonthDisplay(currentMonth)}
                </span>
                <button onClick={goToNextMonth} disabled={!canGoNext()} style={{
                    background: 'transparent', border: 'none', cursor: canGoNext() ? 'pointer' : 'not-allowed',
                    padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: canGoNext() ? G.t2 : G.t3, opacity: canGoNext() ? 1 : 0.5,
                }}>
                    <CaretRight size={18} weight="bold" />
                </button>
            </div>

            {/* User Stats Card */}
            {userRank && (
                <div style={{
                    background: `linear-gradient(135deg, ${G.accentDim}, rgba(0,214,143,0.06))`,
                    border: `1px solid rgba(0,214,143,0.25)`, borderRadius: '16px', padding: '16px',
                    marginBottom: '24px', backdropFilter: 'blur(12px)',
                }}>
                    <p style={{ fontSize: '11px', color: G.t3, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Your Rank This Month
                    </p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: G.accent }}>
                                #{userRank}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: G.t2 }}>
                                {userPoints} điểm
                            </p>
                        </div>
                        <span style={{ fontSize: '32px', marginBottom: '4px' }}>
                            {getMedalEmoji(userRank) || '⭐'}
                        </span>
                    </div>
                </div>
            )}

            {/* Leaderboard */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: G.t3 }}>
                    <p>Loading leaderboard...</p>
                </div>
            ) : entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: G.t3 }}>
                    <p>No data available for this period</p>
                </div>
            ) : (
                <div style={{
                    background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px',
                    overflow: 'hidden', backdropFilter: 'blur(12px)',
                }}>
                    {entries.map((entry, index) => {
                        const rank = index + 1
                        const isMe = (entry.user_id || entry.userId) === user?.id
                        const medal = getMedalEmoji(rank)

                        return (
                            <div
                                key={entry.user_id || entry.userId || index}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '14px 16px',
                                    borderBottom: index < entries.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                                    background: isMe ? G.accentDim : 'transparent',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: rank <= 3 ? 'rgba(0,214,143,0.2)' : 'rgba(255,255,255,0.08)',
                                        border: `1px solid ${rank <= 3 ? 'rgba(0,214,143,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: medal ? '16px' : '14px', fontWeight: 700,
                                        color: rank <= 3 ? G.accent : G.t3,
                                    }}>
                                        {medal || rank}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{
                                            margin: 0, fontSize: '14px', fontWeight: isMe ? 700 : 600,
                                            color: isMe ? G.accent : G.t1,
                                        }}>
                                            {entry.full_name || entry.userName || 'Thành viên'}
                                        </p>
                                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: G.t3 }}>
                                            {rank <= 3 ? ['🥇 Gold', '🥈 Silver', '🥉 Bronze'][rank - 1] : 'Member'}
                                        </p>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <p style={{
                                        margin: 0, fontSize: '16px', fontWeight: 700,
                                        color: G.accent,
                                    }}>
                                        {entry.total_points ?? entry.points ?? 0}
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: G.t3 }}>
                                        điểm
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Back to Attendance */}
            <button onClick={() => router.push('/app/attendance')} style={{
                width: '100%', marginTop: '20px', padding: '14px', borderRadius: '12px',
                background: 'transparent', border: `1px solid ${G.glassBorder}`,
                color: G.t2, fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s ease',
            }}>
                ← Back to Attendance
            </button>
        </div>
    )
}
