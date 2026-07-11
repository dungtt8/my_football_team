'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, LeaderboardEntry } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { CaretLeft, CaretRight } from 'phosphor-react'

const AVATAR_GRADS = [
    'linear-gradient(135deg,#FFB27A,#FF7A1A)',
    'linear-gradient(135deg,#7A5AF8,#2E7CF6)',
    'linear-gradient(135deg,#12B76A,#027A48)',
    'linear-gradient(135deg,#F04438,#F5A623)',
    'linear-gradient(135deg,#2E7CF6,#12B76A)',
]

const POD_GRAD: Record<number, string> = {
    1: 'linear-gradient(135deg,#FFD772,#F5A623)',
    2: 'linear-gradient(135deg,#CBD5E1,#94A3B8)',
    3: 'linear-gradient(135deg,#F0B08A,#C97B4A)',
}

const getMedal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '')

const getName = (e?: LeaderboardEntry) => e?.full_name || e?.userName || 'Thành viên'

const getInitials = (name: string) =>
    name.trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase()

const getPoints = (e?: LeaderboardEntry) => e?.total_points ?? e?.points ?? 0

export default function LeaderboardPage() {
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { getLeaderboard, getHistoricalLeaderboard } = useAttendance()

    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [currentMonth, setCurrentMonth] = useState<string>(() => {
        const now = new Date()
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    })
    const [isLoading, setIsLoading] = useState(true)

    const nowYearMonth = () => {
        const now = new Date()
        return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    }

    const loadLeaderboard = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = currentMonth === nowYearMonth()
                ? await getLeaderboard()
                : await getHistoricalLeaderboard(currentMonth)
            setEntries(data || [])
        } catch (error) {
            console.error('Error loading leaderboard:', error)
            toast('Failed to load leaderboard', 'error')
        } finally {
            setIsLoading(false)
        }
    }, [currentMonth, user?.id])

    useEffect(() => {
        if (authLoading || !currentMonth) return
        loadLeaderboard()
    }, [currentMonth, authLoading])

    const goToPreviousMonth = () => {
        const [year, month] = currentMonth.split('-')
        let m = parseInt(month) - 1
        let y = parseInt(year)
        if (m < 1) { m = 12; y -= 1 }
        setCurrentMonth(`${y}-${String(m).padStart(2, '0')}`)
    }

    const canGoNext = () => currentMonth < nowYearMonth()

    const goToNextMonth = () => {
        if (!canGoNext()) return
        const [year, month] = currentMonth.split('-')
        let m = parseInt(month) + 1
        let y = parseInt(year)
        if (m > 12) { m = 1; y += 1 }
        const next = `${y}-${String(m).padStart(2, '0')}`
        if (next <= nowYearMonth()) setCurrentMonth(next)
    }

    const formatMonthDisplay = (yearMonth: string) => {
        const [year, month] = yearMonth.split('-')
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    }

    const isMe = (e: LeaderboardEntry) => (e.user_id || e.userId) === user?.id

    const top3 = entries.slice(0, 3)
    const rest = entries.slice(3)

    // Level card from current user's points
    const meEntry = entries.find(isMe)
    const mePoints = getPoints(meEntry)
    const level = Math.floor(mePoints / 200) + 1
    const intoLevel = mePoints % 200
    const pct = Math.round((intoLevel / 200) * 100)
    const toNext = 200 - intoLevel

    const renderRows = (list: LeaderboardEntry[]) => list.map((entry, i) => {
        const rank = entries.indexOf(entry) + 1
        const me = isMe(entry)
        const name = getName(entry)
        return (
            <div key={entry.user_id || entry.userId || i} className={`lb-row${me ? ' me' : ''}`}>
                <div className={`rank${rank <= 3 ? ' top' : ''}`}>{rank}</div>
                <div className="avatar" style={{ width: 38, height: 38, borderRadius: 11, background: AVATAR_GRADS[i % AVATAR_GRADS.length] }}>
                    {getInitials(name)}
                </div>
                <div className="rc" style={{ flex: 1 }}>
                    <b style={{ fontSize: 14 }}>
                        {rank <= 3 ? `${getMedal(rank)} ` : ''}{name}
                        {me && <span className="chip soft" style={{ padding: '2px 8px', marginLeft: 4 }}>Bạn</span>}
                    </b>
                    <small>
                        {entry.streak ? `chuỗi ${entry.streak}` : `${getPoints(entry)} điểm`}
                    </small>
                </div>
                <b className="amt-pos">{getPoints(entry)}</b>
            </div>
        )
    })

    // ---- Reusable pieces ----

    const pillsAndNavEl = (
        <>
            <div className="pills">
                <div className="pill on">Tháng này</div>
                <div className="pill">Mùa giải</div>
                <div className="pill">Mọi lúc</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 14 }}>
                <button onClick={goToPreviousMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--ink-3)' }}>
                    <CaretLeft size={18} weight="bold" />
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, minWidth: 150, textAlign: 'center' }}>{formatMonthDisplay(currentMonth)}</span>
                <button onClick={goToNextMonth} disabled={!canGoNext()} style={{ background: 'transparent', border: 'none', cursor: canGoNext() ? 'pointer' : 'not-allowed', display: 'flex', color: 'var(--ink-3)', opacity: canGoNext() ? 1 : 0.4 }}>
                    <CaretRight size={18} weight="bold" />
                </button>
            </div>
        </>
    )

    const podiumEl = !isLoading && top3.length >= 3 && (
        <div className="card pad">
            <div className="podium">
                {[
                    { e: top3[1], rank: 2, cls: 'p2' },
                    { e: top3[0], rank: 1, cls: 'p1' },
                    { e: top3[2], rank: 3, cls: 'p3' },
                ].map(({ e, rank, cls }) => (
                    <div key={rank} className={`pod ${cls}`}>
                        <div className="pa">{getInitials(getName(e))}</div>
                        <div className="stand">
                            <span className="medal">{getMedal(rank)}</span>
                            <b>{getName(e)}</b>
                            <small>{getPoints(e)} đ</small>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    const restListEl = isLoading ? (
        <div className="empty">Đang tải bảng xếp hạng...</div>
    ) : entries.length === 0 ? (
        <div className="empty">Chưa có dữ liệu cho kỳ này</div>
    ) : (
        <div className="card">{renderRows(rest.length > 0 ? rest : entries)}</div>
    )

    const fullListRowsEl = isLoading ? (
        <div className="empty">Đang tải bảng xếp hạng...</div>
    ) : entries.length === 0 ? (
        <div className="empty">Chưa có dữ liệu cho kỳ này</div>
    ) : (
        renderRows(entries)
    )

    const levelEl = !isLoading && meEntry && (
        <div className="card pad levelcard">
            <div className="ring" style={{ '--p': pct } as React.CSSProperties}><i>Lv {level}</i></div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b style={{ fontFamily: 'var(--font-head)' }}>Cấp độ {level}</b>
                    <small style={{ color: 'var(--ink-3)' }}>{mePoints} / {level * 200}</small>
                </div>
                <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                <small style={{ color: 'var(--ink-3)', marginTop: 8, display: 'block' }}>
                    Còn {toNext} điểm để lên <b style={{ color: 'var(--brand-600)' }}>Lv {level + 1}</b>
                </small>
            </div>
        </div>
    )

    return (
        <div className="screen-body" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

            {/* Mobile header — matches mockup M.rank */}
            <div className="md:hidden">
                <div className="eyebrow">Bảng xếp hạng</div>
                <div className="sec-title" style={{ fontSize: 22, marginTop: 4 }}>Cầu thủ chuyên cần nhất</div>
            </div>

            {/* Desktop header — matches mockup D.rank .page-h */}
            <div className="hidden md:block page-h">
                <h1>Bảng xếp hạng 🏆</h1>
                <p>Cầu thủ chuyên cần nhất mùa giải.</p>
            </div>

            {/* Mobile layout — matches mockup M.rank: pills, podium, list, level */}
            <div className="md:hidden">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {pillsAndNavEl}
                    {podiumEl}
                    {restListEl}
                    {levelEl}
                </div>
            </div>

            {/* Desktop layout — matches mockup D.rank: pills+full list (left) | podium+level (right) */}
            <div className="hidden md:block">
                <div className="dgrid">
                    <div className="card">
                        <div className="pad">{pillsAndNavEl}</div>
                        {fullListRowsEl}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {podiumEl}
                        {levelEl}
                    </div>
                </div>
            </div>
        </div>
    )
}
