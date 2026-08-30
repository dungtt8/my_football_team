'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useAttendance, MatchPerformance } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'

const G = {
    glass: '#FFFFFF',
    glassBorder: '#E7ECF3',
    accent: '#12B76A',
    accentDim: 'rgba(18,183,106,0.12)',
    red: '#F04438',
    redDim: 'rgba(240,68,56,0.12)',
    yellow: '#F5A623',
    yellowDim: 'rgba(245,166,35,0.12)',
    t1: '#0B1220',
    t2: 'rgba(11,18,32,0.55)',
    t3: 'rgba(11,18,32,0.30)',
}

const STATUS_LABEL: Record<MatchPerformance['status'], string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
}
const STATUS_COLOR: Record<MatchPerformance['status'], { fg: string; bg: string; border: string }> = {
    pending: { fg: G.yellow, bg: G.yellowDim, border: 'rgba(245,166,35,0.25)' },
    approved: { fg: G.accent, bg: G.accentDim, border: 'rgba(18,183,106,0.25)' },
    rejected: { fg: G.red, bg: G.redDim, border: 'rgba(240,68,56,0.25)' },
}

interface MatchPerformancePanelProps {
    sessionId: string
    isManager: boolean
    currentUserId?: string
    myCheckinResponse: 'yes' | 'no' | null | undefined
    homeScore: number | null
    awayScore: number | null
    sessionActive: boolean
    onResultUpdated: (updates: { home_score: number; away_score: number }) => void
}

export default function MatchPerformancePanel({
    sessionId, isManager, currentUserId, myCheckinResponse,
    homeScore, awayScore, sessionActive, onResultUpdated,
}: MatchPerformancePanelProps) {
    const { getMatchPerformances, submitMyPerformance, reviewPerformance, setMatchResult } = useAttendance()
    const { toast } = useToast()

    const [performances, setPerformances] = useState<MatchPerformance[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [myGoals, setMyGoals] = useState('0')
    const [myAssists, setMyAssists] = useState('0')
    const [isSubmittingMine, setIsSubmittingMine] = useState(false)
    const [reviewingId, setReviewingId] = useState<string | null>(null)
    const [showResultForm, setShowResultForm] = useState(false)
    const [homeInput, setHomeInput] = useState(String(homeScore ?? 0))
    const [awayInput, setAwayInput] = useState(String(awayScore ?? 0))
    const [isSavingResult, setIsSavingResult] = useState(false)

    const load = useCallback(async () => {
        setIsLoading(true)
        const list = await getMatchPerformances(sessionId)
        setPerformances(list)
        const mine = list.find(p => p.user_id === currentUserId)
        if (mine) { setMyGoals(String(mine.goals)); setMyAssists(String(mine.assists)) }
        setIsLoading(false)
    }, [sessionId, currentUserId, getMatchPerformances])

    useEffect(() => { load() }, [load])

    const myEntry = performances.find(p => p.user_id === currentUserId)
    const myEntryLocked = myEntry?.status === 'approved'

    const handleSubmitMine = async () => {
        setIsSubmittingMine(true)
        try {
            await submitMyPerformance(sessionId, { goals: Number(myGoals) || 0, assists: Number(myAssists) || 0 })
            toast('Đã gửi thành tích, chờ quản lý duyệt', 'success')
            load()
        } catch (e: any) {
            toast(e?.message || 'Lỗi khi gửi thành tích', 'error')
        } finally {
            setIsSubmittingMine(false)
        }
    }

    const handleReview = async (userId: string, status: 'approved' | 'rejected', goals: number, assists: number) => {
        setReviewingId(userId)
        try {
            await reviewPerformance(sessionId, userId, { goals, assists, status })
            toast(status === 'approved' ? 'Đã duyệt thành tích' : 'Đã từ chối thành tích', 'success')
            load()
        } catch (e: any) {
            toast(e?.message || 'Lỗi khi duyệt thành tích', 'error')
        } finally {
            setReviewingId(null)
        }
    }

    const handleSaveResult = async () => {
        setIsSavingResult(true)
        try {
            const home_score = Number(homeInput) || 0
            const away_score = Number(awayInput) || 0
            await setMatchResult(sessionId, { home_score, away_score })
            toast('Đã cập nhật tỷ số trận đấu', 'success')
            onResultUpdated({ home_score, away_score })
            setShowResultForm(false)
        } catch (e: any) {
            toast(e?.message || 'Lỗi khi cập nhật tỷ số', 'error')
        } finally {
            setIsSavingResult(false)
        }
    }

    const hasResult = homeScore !== null && awayScore !== null

    return (
        <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Block A — Kết quả trận đấu */}
            <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
                    Kết quả trận đấu
                </p>
                {hasResult ? (
                    <p style={{ fontSize: '20px', fontWeight: 800, color: G.t1, margin: 0 }}>
                        Đội mình {homeScore} - {awayScore} Đối thủ
                    </p>
                ) : (
                    <p style={{ fontSize: '14px', color: G.t3, margin: 0 }}>Chưa cập nhật kết quả</p>
                )}
                {isManager && sessionActive && (
                    showResultForm ? (
                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="number" min={0} value={homeInput} onChange={e => setHomeInput(e.target.value)}
                                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, fontSize: '16px', textAlign: 'center' }} />
                                <span style={{ color: G.t3, fontWeight: 700 }}>-</span>
                                <input type="number" min={0} value={awayInput} onChange={e => setAwayInput(e.target.value)}
                                    style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, fontSize: '16px', textAlign: 'center' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleSaveResult} disabled={isSavingResult} style={{
                                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                    background: G.accent, color: '#fff', fontWeight: 700, fontSize: '13px', opacity: isSavingResult ? 0.6 : 1,
                                }}>{isSavingResult ? 'Đang lưu...' : 'Lưu tỷ số'}</button>
                                <button onClick={() => setShowResultForm(false)} style={{
                                    flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
                                    background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t2, fontWeight: 600, fontSize: '13px',
                                }}>Hủy</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setShowResultForm(true)} style={{
                            marginTop: '12px', padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer', background: G.glass, color: G.t1, border: `1px solid ${G.glassBorder}`,
                        }}>{hasResult ? 'Sửa tỷ số' : 'Nhập tỷ số'}</button>
                    )
                )}
            </div>

            {/* Block B — Thành tích cá nhân */}
            <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
                    Thành tích cá nhân
                </p>

                {myCheckinResponse === 'yes' && (
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${G.glassBorder}` }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', color: G.t3, display: 'block', marginBottom: '4px' }}>Bàn thắng</label>
                                <input type="number" min={0} value={myGoals} disabled={myEntryLocked}
                                    onChange={e => setMyGoals(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, fontSize: '15px', boxSizing: 'border-box', opacity: myEntryLocked ? 0.6 : 1 }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', color: G.t3, display: 'block', marginBottom: '4px' }}>Kiến tạo</label>
                                <input type="number" min={0} value={myAssists} disabled={myEntryLocked}
                                    onChange={e => setMyAssists(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, fontSize: '15px', boxSizing: 'border-box', opacity: myEntryLocked ? 0.6 : 1 }} />
                            </div>
                            {myEntry && (
                                <span style={{
                                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
                                    background: STATUS_COLOR[myEntry.status].bg, color: STATUS_COLOR[myEntry.status].fg,
                                    border: `1px solid ${STATUS_COLOR[myEntry.status].border}`,
                                }}>{STATUS_LABEL[myEntry.status]}</span>
                            )}
                        </div>
                        {!myEntryLocked && (
                            <button onClick={handleSubmitMine} disabled={isSubmittingMine} style={{
                                width: '100%', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                background: G.accent, color: '#fff', fontWeight: 700, fontSize: '13px', opacity: isSubmittingMine ? 0.6 : 1,
                            }}>{isSubmittingMine ? 'Đang gửi...' : (myEntry ? 'Cập nhật thành tích' : 'Gửi thành tích')}</button>
                        )}
                    </div>
                )}

                {isLoading ? (
                    <p style={{ fontSize: '13px', color: G.t3 }}>Đang tải...</p>
                ) : performances.length === 0 ? (
                    <p style={{ fontSize: '13px', color: G.t3 }}>Chưa có ai khai thành tích</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {performances.map(p => (
                            <div key={p.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap',
                                padding: '10px 14px', background: '#F8FAFC', border: `1px solid ${G.glassBorder}`, borderRadius: '12px',
                            }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: G.t1 }}>{p.full_name || p.email}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: G.t2 }}>⚽ {p.goals} bàn · 🅰️ {p.assists} kiến tạo</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                                        background: STATUS_COLOR[p.status].bg, color: STATUS_COLOR[p.status].fg,
                                        border: `1px solid ${STATUS_COLOR[p.status].border}`,
                                    }}>{STATUS_LABEL[p.status]}</span>
                                    {isManager && p.status === 'pending' && (
                                        <>
                                            <button disabled={reviewingId === p.user_id}
                                                onClick={() => handleReview(p.user_id, 'approved', p.goals, p.assists)}
                                                style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', background: G.accentDim, color: G.accent, border: `1px solid rgba(18,183,106,0.25)` }}>
                                                Duyệt
                                            </button>
                                            <button disabled={reviewingId === p.user_id}
                                                onClick={() => handleReview(p.user_id, 'rejected', p.goals, p.assists)}
                                                style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', background: G.redDim, color: G.red, border: `1px solid rgba(240,68,56,0.2)` }}>
                                                Từ chối
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
