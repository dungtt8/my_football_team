'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAttendance, AttendanceSession, AttendanceCheckin, SessionStats } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft } from 'phosphor-react'
import { SessionForm, SessionFormData } from '@/components/Attendance/SessionForm'

const G = {
    bg: '#FFFFFF',
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

export default function SessionDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { user, role } = useAuth()
    const { toast } = useToast()
    const id = params.id as string

    const { getSession, respondToCheckin, managerRespondToCheckin, closeSession, updateSession } = useAttendance()
    const isManager = role === 'co_manager' || role === 'manager' || role === 'owner'

    const [session, setSession] = useState<AttendanceSession | null>(null)
    const [checkins, setCheckins] = useState<AttendanceCheckin[]>([])
    const [stats, setStats] = useState<SessionStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isActing, setIsActing] = useState<string | null>(null)
    const [confirmClose, setConfirmClose] = useState(false)
    const [activeTab, setActiveTab] = useState<'all' | 'yes' | 'no' | 'pending'>('all')
    const [showEditForm, setShowEditForm] = useState(false)
    const [isSavingEdit, setIsSavingEdit] = useState(false)

    useEffect(() => { loadData() }, [id])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const result = await getSession(id)
            setSession(result.session)
            setCheckins(result.records)
            setStats(result.stats)
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

    const handleEditSubmit = async (data: SessionFormData) => {
        setIsSavingEdit(true)
        try {
            await updateSession(id, data)
            toast('Đã cập nhật buổi tập', 'success')
            setShowEditForm(false)
            loadData()
        } catch (e: any) { toast(e?.message || 'Lỗi cập nhật', 'error') }
        finally { setIsSavingEdit(false) }
    }

    const myCheckin = checkins.find(c => c.user_id === user?.id)
    const isActive = session?.status === 'active'
    const isDeadlinePassed = session?.check_in_deadline
        ? new Date() > new Date(session.check_in_deadline)
        : false
    const canRespond = isActive && !isDeadlinePassed

    const filteredCheckins = checkins.filter(c => {
        if (activeTab === 'yes') return c.response === 'yes'
        if (activeTab === 'no') return c.response === 'no'
        if (activeTab === 'pending') return !c.response
        return true
    })

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

    if (isLoading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>
                {[100, 80, 180, 200].map((h, i) => (
                    <div key={i} style={{ height: h, background: G.glass, borderRadius: '16px', marginBottom: '12px' }} />
                ))}
            </div>
        </div>
    )

    if (!session) return null
    const isMatch = session.session_type === 'match'

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px 40px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>

            {/* Back */}
            <button onClick={() => router.back()} style={{
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
                fontWeight: 500, color: G.t3, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, marginBottom: '24px',
            }}>
                <ArrowLeft size={16} /> Quay lại
            </button>

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '36px' }}>{isMatch ? '⚽' : '🏃'}</span>
                        <div>
                            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, margin: '0 0 4px' }}>
                                {isMatch ? 'Trận đấu' : 'Buổi tập'}
                            </p>
                            <h1 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-head)', color: G.t1, margin: 0 }}>
                                {fmtDate(session.session_date)}
                            </h1>
                        </div>
                    </div>
                    {isManager && isActive && (
                        <button onClick={() => setShowEditForm(true)} style={{
                            flexShrink: 0, padding: '8px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                            cursor: 'pointer', background: G.glass, color: G.t1, border: `1px solid ${G.glassBorder}`,
                        }}>
                            ✏️ Chỉnh sửa
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {session.location && <span style={{ fontSize: '12px', color: G.t2 }}>📍 {session.location}</span>}
                    <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                        background: isActive ? G.accentDim : G.glass,
                        color: isActive ? G.accent : G.t3,
                        border: `1px solid ${isActive ? 'rgba(18,183,106,0.25)' : G.glassBorder}`,
                    }}>
                        {isActive ? '● Đang mở' : '○ Đã đóng'}
                    </span>
                </div>
                {session.check_in_deadline && (
                    <p style={{ fontSize: '12px', color: isDeadlinePassed ? G.red : G.t3, margin: 0 }}>
                        {isDeadlinePassed
                            ? '⛔ Đã hết hạn phản hồi'
                            : `⏰ Hạn phản hồi: ${fmtTime(session.check_in_deadline)}`}
                    </p>
                )}
                {session.description && (
                    <p style={{ fontSize: '13px', color: G.t2, marginTop: '10px', lineHeight: 1.6 }}>{session.description}</p>
                )}
            </div>

            {/* Stats */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '28px' }}>
                    {[
                        { label: 'Tham gia', value: stats.yes, color: G.accent, bg: G.accentDim, border: 'rgba(18,183,106,0.2)' },
                        { label: 'Không', value: stats.no, color: G.red, bg: G.redDim, border: 'rgba(240,68,56,0.2)' },
                        { label: 'Chưa TL', value: stats.pending, color: G.yellow, bg: G.yellowDim, border: 'rgba(245,166,35,0.2)' },
                        { label: 'Tổng', value: stats.total, color: G.t1, bg: G.glass, border: G.glassBorder },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '14px', padding: '12px 10px', backdropFilter: 'blur(12px)' }}>
                            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.color, margin: '0 0 4px', opacity: 0.8 }}>{s.label}</p>
                            <p style={{ fontSize: '26px', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Member: my response card */}
            {!isManager && (
                <div style={{
                    background: myCheckin?.response === 'yes' ? G.accentDim : myCheckin?.response === 'no' ? G.redDim : G.glass,
                    border: `1px solid ${myCheckin?.response === 'yes' ? 'rgba(18,183,106,0.30)' : myCheckin?.response === 'no' ? 'rgba(240,68,56,0.25)' : G.glassBorder}`,
                    borderRadius: '20px', padding: '24px', marginBottom: '28px', backdropFilter: 'blur(16px)',
                }}>
                    {myCheckin?.response === 'yes' ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '40px', margin: '0 0 8px' }}>✅</p>
                            <p style={{ fontWeight: 700, fontSize: '16px', color: G.accent, margin: '0 0 4px' }}>Bạn sẽ tham gia</p>
                            {myCheckin.responded_at && (
                                <p style={{ fontSize: '12px', color: G.t3, margin: 0 }}>Phản hồi lúc {fmtTime(myCheckin.responded_at)}</p>
                            )}
                            {canRespond && myCheckin?.id && (
                                <button
                                    onClick={() => act('change', () => respondToCheckin(myCheckin.id, 'no').then(() => {}), 'Đã cập nhật: Không tham gia')}
                                    disabled={!!isActing}
                                    style={{ marginTop: '14px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: G.redDim, color: G.red, border: `1px solid rgba(240,68,56,0.25)`, opacity: isActing ? 0.5 : 1 }}
                                >
                                    Đổi thành Không tham gia
                                </button>
                            )}
                        </div>
                    ) : myCheckin?.response === 'no' ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '40px', margin: '0 0 8px' }}>❌</p>
                            <p style={{ fontWeight: 700, fontSize: '16px', color: G.red, margin: '0 0 4px' }}>Bạn không tham gia</p>
                            {myCheckin.responded_at && (
                                <p style={{ fontSize: '12px', color: G.t3, margin: 0 }}>Phản hồi lúc {fmtTime(myCheckin.responded_at)}</p>
                            )}
                            {canRespond && myCheckin?.id && (
                                <button
                                    onClick={() => act('change', () => respondToCheckin(myCheckin.id, 'yes').then(() => {}), 'Đã cập nhật: Tham gia')}
                                    disabled={!!isActing}
                                    style={{ marginTop: '14px', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: G.accentDim, color: G.accent, border: `1px solid rgba(18,183,106,0.25)`, opacity: isActing ? 0.5 : 1 }}
                                >
                                    Đổi thành Tham gia
                                </button>
                            )}
                        </div>
                    ) : isDeadlinePassed ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '40px', margin: '0 0 8px' }}>⛔</p>
                            <p style={{ fontWeight: 600, fontSize: '15px', color: G.red, margin: 0 }}>Đã hết hạn phản hồi</p>
                        </div>
                    ) : !isActive ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', color: G.t3 }}>Buổi này đã đóng</p>
                        </div>
                    ) : myCheckin?.id ? (
                        <>
                            <p style={{ fontWeight: 600, fontSize: '15px', color: G.t1, margin: '0 0 6px' }}>
                                Bạn có tham gia {isMatch ? 'trận đấu' : 'buổi tập'} này không?
                            </p>
                            <p style={{ fontSize: '12px', color: G.t3, margin: '0 0 20px' }}>
                                +{10} điểm nếu tham gia
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    disabled={!!isActing}
                                    onClick={() => act('yes', () => respondToCheckin(myCheckin.id, 'yes').then(() => {}), '✅ Đã xác nhận tham gia! +10 điểm')}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                        background: `linear-gradient(135deg, ${G.accent}, #039855)`,
                                        color: '#FFFFFF', fontWeight: 700, fontSize: '15px',
                                        boxShadow: '0 4px 24px rgba(18,183,106,0.35)',
                                        opacity: isActing ? 0.6 : 1, transition: 'opacity 0.2s',
                                    }}
                                >
                                    {isActing === 'yes' ? 'Đang xử lý...' : '✓ Có, tôi tham gia'}
                                </button>
                                <button
                                    disabled={!!isActing}
                                    onClick={() => act('no', () => respondToCheckin(myCheckin.id, 'no').then(() => {}), 'Đã ghi nhận vắng mặt')}
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
                    ) : (
                        <p style={{ textAlign: 'center', fontSize: '13px', color: G.t3 }}>Bạn không có trong danh sách buổi này</p>
                    )}
                </div>
            )}

            {/* Checkin list — visible to everyone; managers can also confirm on a member's behalf */}
            {checkins.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
                        Danh sách phản hồi
                    </p>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        {([
                            ['all', 'Tất cả', stats?.total ?? 0, G.t3, G.glass, G.glassBorder],
                            ['yes', 'Tham gia', stats?.yes ?? 0, G.accent, G.accentDim, 'rgba(18,183,106,0.25)'],
                            ['no', 'Không', stats?.no ?? 0, G.red, G.redDim, 'rgba(240,68,56,0.25)'],
                            ['pending', 'Chưa TL', stats?.pending ?? 0, G.yellow, G.yellowDim, 'rgba(245,166,35,0.25)'],
                        ] as const).map(([tab, label, count, color, bg, border]) => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} style={{
                                padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                background: activeTab === tab ? bg : G.glass,
                                color: activeTab === tab ? color : G.t3,
                                border: `1px solid ${activeTab === tab ? border : G.glassBorder}`,
                                transition: 'all 0.15s',
                            }}>
                                {label} <span style={{ opacity: 0.7 }}>({count})</span>
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredCheckins.map(c => (
                            <div key={c.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: G.glass, border: `1px solid ${G.glassBorder}`,
                                borderRadius: '14px', backdropFilter: 'blur(12px)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '18px' }}>
                                        {c.response === 'yes' ? '✅' : c.response === 'no' ? '❌' : '⏳'}
                                    </span>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.t1 }}>{c.full_name || c.email}</p>
                                        {c.responded_at && (
                                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: G.t3 }}>lúc {fmtTime(c.responded_at)}</p>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                                        background: c.response === 'yes' ? G.accentDim : c.response === 'no' ? G.redDim : G.yellowDim,
                                        color: c.response === 'yes' ? G.accent : c.response === 'no' ? G.red : G.yellow,
                                        border: `1px solid ${c.response === 'yes' ? 'rgba(18,183,106,0.2)' : c.response === 'no' ? 'rgba(240,68,56,0.2)' : 'rgba(245,166,35,0.2)'}`,
                                    }}>
                                        {c.response === 'yes' ? 'Tham gia' : c.response === 'no' ? 'Không' : 'Chưa TL'}
                                    </span>
                                    {isManager && isActive && c.response !== 'yes' && (
                                        <button
                                            disabled={!!isActing}
                                            onClick={() => act(`confirm-${c.id}`, () => managerRespondToCheckin(c.id, 'yes').then(() => {}), `Đã xác nhận tham gia cho ${c.full_name || c.email}`)}
                                            style={{
                                                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                                                background: G.accentDim, color: G.accent, border: `1px solid rgba(18,183,106,0.25)`,
                                                opacity: isActing ? 0.6 : 1,
                                            }}
                                        >
                                            {isActing === `confirm-${c.id}` ? '...' : 'Xác nhận'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {filteredCheckins.length === 0 && (
                            <p style={{ textAlign: 'center', fontSize: '13px', color: G.t3, padding: '20px 0' }}>Không có dữ liệu</p>
                        )}
                    </div>
                </div>
            )}

            {/* Close session (manager) */}
            {isManager && isActive && (
                confirmClose ? (
                    <div style={{ background: G.redDim, border: `1px solid rgba(240,68,56,0.25)`, borderRadius: '16px', padding: '16px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: G.red, margin: '0 0 4px' }}>Xác nhận đóng buổi?</p>
                        <p style={{ fontSize: '11px', color: G.t3, margin: '0 0 14px' }}>Điểm sẽ được trao cho thành viên trả lời "Tham gia". Hành động không thể hoàn tác.</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                disabled={!!isActing}
                                onClick={() => act('close', () => closeSession(id).then(() => {}), 'Đã đóng buổi & trao điểm')}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: G.red, color: '#fff', fontWeight: 700, fontSize: '13px', opacity: isActing ? 0.6 : 1 }}
                            >
                                {isActing === 'close' ? 'Đang xử lý...' : 'Xác nhận đóng'}
                            </button>
                            <button onClick={() => setConfirmClose(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t2, fontWeight: 600, fontSize: '13px' }}>
                                Hủy
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setConfirmClose(true)} style={{
                        width: '100%', padding: '14px', borderRadius: '14px', cursor: 'pointer',
                        background: 'transparent', border: `1px solid rgba(240,68,56,0.35)`,
                        color: G.red, fontWeight: 600, fontSize: '14px',
                    }}>
                        Đóng buổi & trao điểm
                    </button>
                )
            )}

            {/* Edit session modal (manager) */}
            {showEditForm && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--content-left-offset, 0px)', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
                    onClick={() => setShowEditForm(false)}>
                    <div style={{ background: '#F4F7FB', border: `1px solid ${G.glassBorder}`, borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '600px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-head)', color: G.t1, margin: 0 }}>Chỉnh sửa buổi tập</h2>
                            <button onClick={() => setShowEditForm(false)} style={{ background: '#FFFFFF', border: `1px solid ${G.glassBorder}`, color: G.t2, borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>✕</button>
                        </div>
                        <SessionForm
                            initialData={{
                                session_date: session.session_date,
                                session_type: session.session_type,
                                location: session.location || '',
                                description: session.description || '',
                                check_in_deadline: session.check_in_deadline || '',
                            }}
                            onSubmit={handleEditSubmit}
                            isLoading={isSavingEdit}
                            onCancel={() => setShowEditForm(false)}
                            submitLabel="✓ Lưu thay đổi"
                            loadingLabel="Đang lưu..."
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
