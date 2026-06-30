'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, AttendanceSession, AttendanceRecord } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft } from 'phosphor-react'

const G = {
    bg: '#070B14',
    glass: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F',
    accentDim: 'rgba(0,214,143,0.12)',
    red: '#FF6B6B',
    redDim: 'rgba(255,107,107,0.12)',
    blue: '#4A7CFF',
    t1: '#F0F4FF',
    t2: 'rgba(240,244,255,0.55)',
    t3: 'rgba(240,244,255,0.30)',
}

export default function SessionDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { user, role } = useAuth()
    const { toast } = useToast()
    const id = params.id as string

    const { getSession, memberCheckIn, markAbsent, closeSession } = useAttendance()
    const isManager = role === 'co_manager' || role === 'manager' || role === 'owner'

    const [session, setSession] = useState<AttendanceSession | null>(null)
    const [records, setRecords] = useState<AttendanceRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isActing, setIsActing] = useState<string | null>(null) // tracks which action is in progress
    const [confirmClose, setConfirmClose] = useState(false)
    const [activeTab, setActiveTab] = useState<'attended' | 'absent' | 'all'>('all')

    useEffect(() => { loadData() }, [id])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const result = await getSession(id)
            setSession(result.session)
            setRecords(result.records)
        } catch {
            toast('Không thể tải buổi tập', 'error')
            router.push('/app/attendance')
        } finally { setIsLoading(false) }
    }

    const act = async (key: string, fn: () => Promise<void>, successMsg: string) => {
        setIsActing(key)
        try { await fn(); toast(successMsg, 'success'); loadData() }
        catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
        finally { setIsActing(null) }
    }

    const myRecord = records.find((r) => r.user_id === user?.id)
    const isActive = session?.status === 'active'
    const isDeadlinePassed = session?.check_in_deadline
        ? new Date() > new Date(session.check_in_deadline)
        : false

    const attendedRecords = records.filter((r) => r.status === 'attended')
    const absentRecords = records.filter((r) => r.status === 'marked_absent')
    const filteredRecords = activeTab === 'attended' ? attendedRecords : activeTab === 'absent' ? absentRecords : records

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

    if (isLoading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: G.t1, padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>
                {[160, 80, 120, 200].map((h, i) => (
                    <div key={i} style={{ height: h, background: G.glass, borderRadius: '16px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }} />
                ))}
            </div>
        </div>
    )

    if (!session) return null

    const isMatch = session.session_type === 'match'

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>

            {/* Back */}
            <button
                onClick={() => router.back()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: G.t3, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '24px' }}
            >
                <ArrowLeft size={16} /> Quay lại
            </button>

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '36px' }}>{isMatch ? '⚽' : '🏃'}</span>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, margin: '0 0 4px' }}>
                            {isMatch ? 'Trận đấu' : 'Buổi tập'}
                        </p>
                        <h1 style={{ fontSize: '26px', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>
                            {fmtDate(session.session_date)}
                        </h1>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {session.location && (
                        <span style={{ fontSize: '12px', color: G.t2 }}>📍 {session.location}</span>
                    )}
                    <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                        background: isActive ? G.accentDim : G.glass,
                        color: isActive ? G.accent : G.t3,
                        border: `1px solid ${isActive ? 'rgba(0,214,143,0.25)' : G.glassBorder}`,
                    }}>
                        {isActive ? '● Đang mở' : '○ Đã đóng'}
                    </span>
                    {session.check_in_deadline && (
                        <span style={{ fontSize: '11px', color: isDeadlinePassed ? G.red : G.t3 }}>
                            {isDeadlinePassed ? '⛔ Hết hạn điểm danh' : `⏰ Hạn: ${fmtTime(session.check_in_deadline)}`}
                        </span>
                    )}
                </div>

                {session.description && (
                    <p style={{ fontSize: '13px', color: G.t2, marginTop: '12px', lineHeight: 1.6 }}>{session.description}</p>
                )}
            </div>

            {/* Manager stats */}
            {isManager && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
                    {[
                        { label: 'Có mặt', value: attendedRecords.length, color: G.accent, bg: G.accentDim, border: 'rgba(0,214,143,0.2)' },
                        { label: 'Vắng mặt', value: absentRecords.length, color: G.red, bg: G.redDim, border: 'rgba(255,107,107,0.2)' },
                        { label: 'Tổng', value: records.length, color: G.t1, bg: G.glass, border: G.glassBorder },
                    ].map((s) => (
                        <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '16px', padding: '14px 12px', backdropFilter: 'blur(12px)' }}>
                            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.color, margin: '0 0 6px', opacity: 0.8 }}>{s.label}</p>
                            <p style={{ fontSize: '28px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Member: check-in card */}
            {!isManager && (
                <div style={{
                    background: myRecord?.status === 'attended' ? G.accentDim : G.glass,
                    border: `1px solid ${myRecord?.status === 'attended' ? 'rgba(0,214,143,0.30)' : G.glassBorder}`,
                    borderRadius: '20px', padding: '24px', marginBottom: '28px',
                    backdropFilter: 'blur(16px)',
                    boxShadow: myRecord?.status === 'attended' ? '0 0 40px rgba(0,214,143,0.10)' : 'none',
                }}>
                    {myRecord?.status === 'attended' ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '40px', margin: '0 0 8px' }}>✅</p>
                            <p style={{ fontWeight: 700, fontSize: '16px', color: G.accent, margin: '0 0 4px' }}>Đã điểm danh</p>
                            {myRecord.checked_in_at && (
                                <p style={{ fontSize: '12px', color: G.t3, margin: 0 }}>lúc {fmtTime(myRecord.checked_in_at)}</p>
                            )}
                        </div>
                    ) : myRecord?.status === 'marked_absent' ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '40px', margin: '0 0 8px' }}>❌</p>
                            <p style={{ fontWeight: 600, fontSize: '15px', color: G.red, margin: 0 }}>Đã ghi nhận vắng mặt</p>
                        </div>
                    ) : isDeadlinePassed ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '40px', margin: '0 0 8px' }}>⛔</p>
                            <p style={{ fontWeight: 600, fontSize: '15px', color: G.red, margin: 0 }}>Đã hết hạn điểm danh</p>
                        </div>
                    ) : !isActive ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', color: G.t3 }}>Buổi này đã đóng</p>
                        </div>
                    ) : (
                        <>
                            <p style={{ fontWeight: 600, fontSize: '15px', color: G.t1, margin: '0 0 16px' }}>
                                Bạn có tham gia {isMatch ? 'trận đấu' : 'buổi tập'} này không?
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    disabled={!!isActing}
                                    onClick={() => act('checkin', () => memberCheckIn(id).then(() => {}), '✅ Điểm danh thành công! +10 điểm')}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                        background: `linear-gradient(135deg, ${G.accent}, #00A36C)`,
                                        color: '#070B14', fontWeight: 700, fontSize: '15px',
                                        boxShadow: '0 4px 24px rgba(0,214,143,0.35)',
                                        opacity: isActing ? 0.6 : 1, transition: 'opacity 0.2s',
                                    }}
                                >
                                    {isActing === 'checkin' ? 'Đang xử lý...' : '✓ Tham gia'}
                                </button>
                                <button
                                    disabled={!!isActing}
                                    onClick={() => act('absent-me', () => markAbsent(id, user?.id || '').then(() => {}), 'Đã ghi nhận không tham gia (-5 điểm)')}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '14px', cursor: 'pointer',
                                        background: G.glass, border: `1px solid ${G.glassBorder}`,
                                        color: G.t2, fontWeight: 600, fontSize: '14px',
                                        opacity: isActing ? 0.6 : 1, transition: 'opacity 0.2s',
                                    }}
                                >
                                    Không tham gia
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Attendance records (manager) */}
            {isManager && records.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>Danh sách điểm danh</p>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                        {([['all', 'Tất cả', records.length], ['attended', 'Có mặt', attendedRecords.length], ['absent', 'Vắng mặt', absentRecords.length]] as const).map(([tab, label, count]) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                    background: activeTab === tab ? (tab === 'absent' ? G.redDim : G.accentDim) : G.glass,
                                    color: activeTab === tab ? (tab === 'absent' ? G.red : G.accent) : G.t3,
                                    border: `1px solid ${activeTab === tab ? (tab === 'absent' ? 'rgba(255,107,107,0.25)' : 'rgba(0,214,143,0.25)') : G.glassBorder}`,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {label} <span style={{ opacity: 0.7 }}>({count})</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredRecords.map((r) => {
                            const isAttended = r.status === 'attended'
                            const canMarkAbsent = isActive && isAttended
                            return (
                                <div
                                    key={r.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 16px', background: G.glass, border: `1px solid ${G.glassBorder}`,
                                        borderRadius: '14px', backdropFilter: 'blur(12px)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                        <span style={{ fontSize: '18px' }}>{isAttended ? '✅' : '❌'}</span>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.t1 }}>{r.full_name || r.user_id}</p>
                                            {r.checked_in_at && (
                                                <p style={{ margin: '2px 0 0', fontSize: '11px', color: G.t3 }}>điểm danh lúc {fmtTime(r.checked_in_at)}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                                            background: isAttended ? G.accentDim : G.redDim,
                                            color: isAttended ? G.accent : G.red,
                                            border: `1px solid ${isAttended ? 'rgba(0,214,143,0.2)' : 'rgba(255,107,107,0.2)'}`,
                                        }}>
                                            {isAttended ? 'Có mặt' : 'Vắng mặt'}
                                        </span>
                                        {canMarkAbsent && (
                                            <button
                                                disabled={!!isActing}
                                                onClick={() => act(`absent-${r.user_id}`, () => markAbsent(id, r.user_id || '').then(() => {}), 'Đã đánh vắng mặt')}
                                                style={{
                                                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                                    background: G.redDim, color: G.red, border: `1px solid rgba(255,107,107,0.2)`,
                                                    opacity: isActing ? 0.5 : 1,
                                                }}
                                            >
                                                Vắng
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Manager: mark absent for non-checked-in members */}
            {isManager && isActive && (
                <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '20px', marginBottom: '20px', backdropFilter: 'blur(16px)' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: G.t1, margin: '0 0 4px' }}>Đánh vắng mặt thủ công</p>
                    <p style={{ fontSize: '11px', color: G.t3, margin: '0 0 14px' }}>Nhập ID thành viên để đánh vắng mặt (-5 điểm)</p>
                    <MarkAbsentForm
                        disabled={!!isActing}
                        onSubmit={(userId) => act(`absent-manual-${userId}`, () => markAbsent(id, userId).then(() => {}), 'Đã đánh vắng mặt (-5 điểm)')}
                    />
                </div>
            )}

            {/* Manager: close session */}
            {isManager && isActive && (
                <>
                    {confirmClose ? (
                        <div style={{ background: G.redDim, border: `1px solid rgba(255,107,107,0.25)`, borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: G.red, margin: '0 0 4px' }}>Xác nhận đóng buổi?</p>
                            <p style={{ fontSize: '11px', color: G.t3, margin: '0 0 14px' }}>Hành động này không thể hoàn tác.</p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    disabled={!!isActing}
                                    onClick={() => act('close', () => closeSession(id).then(() => {}), 'Đã đóng buổi')}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                        background: G.red, color: '#fff', fontWeight: 700, fontSize: '13px',
                                        opacity: isActing ? 0.6 : 1,
                                    }}
                                >
                                    {isActing === 'close' ? 'Đang đóng...' : 'Xác nhận đóng'}
                                </button>
                                <button
                                    onClick={() => setConfirmClose(false)}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer',
                                        background: G.glass, border: `1px solid ${G.glassBorder}`,
                                        color: G.t2, fontWeight: 600, fontSize: '13px',
                                    }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmClose(true)}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '14px', cursor: 'pointer',
                                background: 'transparent', border: `1px solid rgba(255,107,107,0.35)`,
                                color: G.red, fontWeight: 600, fontSize: '14px',
                                transition: 'all 0.15s',
                            }}
                        >
                            Đóng buổi
                        </button>
                    )}
                </>
            )}
        </div>
    )
}

function MarkAbsentForm({ onSubmit, disabled }: { onSubmit: (userId: string) => void; disabled: boolean }) {
    const [userId, setUserId] = useState('')
    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID thành viên"
                style={{
                    flex: 1, padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#F0F4FF', outline: 'none',
                }}
            />
            <button
                disabled={disabled || !userId.trim()}
                onClick={() => { onSubmit(userId.trim()); setUserId('') }}
                style={{
                    padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    background: 'rgba(255,107,107,0.15)', color: '#FF6B6B',
                    border: '1px solid rgba(255,107,107,0.25)',
                    opacity: (disabled || !userId.trim()) ? 0.5 : 1,
                }}
            >
                Đánh
            </button>
        </div>
    )
}
