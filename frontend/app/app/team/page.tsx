'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useTeam, TeamMember } from '@/hooks/useTeam'
import { useToast } from '@/hooks/useToast'

const G = {
    glass: '#FFFFFF', glassBorder: '#E7ECF3',
    accent: '#12B76A', accentDim: 'rgba(18,183,106,0.12)',
    blue: '#2E7CF6', blueDim: 'rgba(46,124,246,0.12)',
    t1: '#0B1220', t2: 'rgba(11,18,32,0.55)', t3: 'rgba(11,18,32,0.30)',
    red: '#F04438', redDim: 'rgba(240,68,56,0.12)',
}

const ROLE_LABELS: Record<string, string> = {
    owner: 'Chủ đội', co_manager: 'Phó quản lý', member: 'Thành viên',
}
const ROLE_OPTIONS = [
    { value: 'member', label: 'Thành viên' },
    { value: 'co_manager', label: 'Phó quản lý' },
    { value: 'owner', label: 'Chủ đội' },
]
const roleColor = (r: string) =>
    r === 'owner' ? G.accent : r === 'co_manager' ? G.blue : G.t3
const roleBg = (r: string) =>
    r === 'owner' ? G.accentDim : r === 'co_manager' ? G.blueDim : '#F8FAFC'
const roleBorder = (r: string) =>
    r === 'owner' ? 'rgba(18,183,106,0.25)' : r === 'co_manager' ? 'rgba(46,124,246,0.25)' : G.glassBorder

export default function TeamMembersPage() {
    const router = useRouter()
    const { user, role } = useAuth()
    const { toast } = useToast()
    const { listMembers, updateMemberRole, deactivateMember, kickMember, loading } = useTeam()
    const isOwner = role === 'owner'

    const [members, setMembers] = useState<TeamMember[]>([])
    const [editing, setEditing] = useState<{ id: number; currentRole: string } | null>(null)
    const [selectedRole, setSelectedRole] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [confirmAction, setConfirmAction] = useState<{ type: 'kick' | 'deactivate'; memberId: number; memberName: string } | null>(null)
    const [isActioning, setIsActioning] = useState(false)

    useEffect(() => {
        listMembers().then(setMembers).catch(() => toast('Không thể tải danh sách', 'error'))
    }, [])

    const openEdit = (m: TeamMember) => {
        setEditing({ id: m.id, currentRole: m.role })
        setSelectedRole(m.role)
    }

    const handleUpdateRole = async () => {
        if (!editing || selectedRole === editing.currentRole) { setEditing(null); return }
        setIsUpdating(true)
        try {
            await updateMemberRole(editing.id, selectedRole)
            toast('Đã cập nhật role', 'success')
            setMembers(prev => prev.map(m => m.id === editing.id ? { ...m, role: selectedRole as TeamMember['role'] } : m))
            setEditing(null)
        } catch (e: any) { toast(e?.message || 'Lỗi cập nhật', 'error') }
        finally { setIsUpdating(false) }
    }

    const handleKickMember = async () => {
        if (!confirmAction || confirmAction.type !== 'kick') return
        setIsActioning(true)
        try {
            await kickMember(confirmAction.memberId)
            toast(`Đã loại "${confirmAction.memberName}" khỏi đội`, 'success')
            setMembers(prev => prev.filter(m => m.id !== confirmAction.memberId))
            setConfirmAction(null)
        } catch (e: any) { toast(e?.message || 'Lỗi loại thành viên', 'error') }
        finally { setIsActioning(false) }
    }

    const handleDeactivateMember = async () => {
        if (!confirmAction || confirmAction.type !== 'deactivate') return
        setIsActioning(true)
        try {
            await deactivateMember(confirmAction.memberId)
            toast(`Đã tạm dừng "${confirmAction.memberName}"`, 'success')
            setMembers(prev => prev.map(m => m.id === confirmAction.memberId ? { ...m, status: 'inactive' } : m))
            setConfirmAction(null)
        } catch (e: any) { toast(e?.message || 'Lỗi tạm dừng thành viên', 'error') }
        finally { setIsActioning(false) }
    }

    const initials = (name: string) => name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => router.back()} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t1, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '4px' }}>Đội bóng</p>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-head)', color: G.t1, margin: 0 }}>Quản lý thành viên</h1>
                    </div>
                </div>
                {isOwner && (
                    <button
                        onClick={() => router.push('/app/team/settings')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            color: G.t2,
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as any).style.background = G.accentDim;
                            (e.currentTarget as any).style.color = G.accent;
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as any).style.background = G.glass;
                            (e.currentTarget as any).style.color = G.t2;
                        }}
                    >
                        ⚙️ Cài đặt
                    </button>
                )}
            </div>

            {/* Count */}
            <p style={{ fontSize: '13px', color: G.t3, marginBottom: '16px' }}>{members.length} thành viên</p>

            {/* Member list */}
            {loading ? (
                <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                    <p style={{ color: G.t3, margin: 0 }}>Đang tải...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {members.map(m => {
                        const isMe = m.id === (user as any)?.id
                        return (
                            <div key={m.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                                padding: '14px 16px', background: isMe ? G.accentDim : G.glass,
                                border: `1px solid ${isMe ? 'rgba(18,183,106,0.20)' : G.glassBorder}`,
                                borderRadius: '16px', backdropFilter: 'blur(12px)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                        background: m.role === 'owner' ? 'linear-gradient(135deg, #12B76A, #039855)' : m.role === 'co_manager' ? 'linear-gradient(135deg, #2E7CF6, #1D4ED8)' : '#E7ECF3',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '14px', fontWeight: 700, color: m.role === 'member' ? G.t2 : '#FFFFFF',
                                    }}>{initials(m.full_name || 'U')}</div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {m.full_name}{isMe ? ' (tôi)' : ''}
                                        </p>
                                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: G.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {m.phone || m.email}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: roleBg(m.role), color: roleColor(m.role), border: `1px solid ${roleBorder(m.role)}` }}>
                                        {ROLE_LABELS[m.role] || m.role}
                                    </span>
                                    {isOwner && !isMe && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button onClick={() => openEdit(m)} style={{ padding: '6px 10px', borderRadius: '8px', background: '#F3F6FA', border: `1px solid ${G.glassBorder}`, color: G.t2, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { (e.currentTarget as any).background = G.blue; (e.currentTarget as any).color = '#FFFFFF' }} onMouseLeave={(e) => { (e.currentTarget as any).background = '#F3F6FA'; (e.currentTarget as any).color = G.t2 }}>
                                                Sửa
                                            </button>
                                            <button onClick={() => setConfirmAction({ type: 'deactivate', memberId: m.id, memberName: m.full_name })} style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,122,26,0.1)', border: `1px solid rgba(255,122,26,0.2)`, color: '#FF7A1A', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { (e.currentTarget as any).background = 'rgba(255,122,26,0.2)' }} onMouseLeave={(e) => { (e.currentTarget as any).background = 'rgba(255,122,26,0.1)' }}>
                                                Tạm dừng
                                            </button>
                                            <button onClick={() => setConfirmAction({ type: 'kick', memberId: m.id, memberName: m.full_name })} style={{ padding: '6px 10px', borderRadius: '8px', background: G.redDim, border: `1px solid rgba(240,68,56,0.2)`, color: G.red, fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { (e.currentTarget as any).background = 'rgba(240,68,56,0.25)' }} onMouseLeave={(e) => { (e.currentTarget as any).background = G.redDim }}>
                                                Loại
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Confirm action modal */}
            {confirmAction && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--content-left-offset, 0px)', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={() => setConfirmAction(null)}>
                    <div style={{ background: '#F4F7FB', border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: 600, color: G.t1 }}>
                            {confirmAction.type === 'kick' ? 'Loại thành viên?' : 'Tạm dừng thành viên?'}
                        </h3>
                        <p style={{ margin: '0 0 20px', fontSize: '14px', color: G.t2, lineHeight: '1.5' }}>
                            {confirmAction.type === 'kick'
                                ? `Loại "${confirmAction.memberName}" khỏi đội. Họ sẽ không thể truy cập lại.`
                                : `Tạm dừng "${confirmAction.memberName}". Họ sẽ có thể tham gia lại sau.`}
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setConfirmAction(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: 'transparent', color: G.t2, fontWeight: 500, cursor: 'pointer' }}>Huỷ</button>
                            <button
                                onClick={confirmAction.type === 'kick' ? handleKickMember : handleDeactivateMember}
                                disabled={isActioning}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                    background: confirmAction.type === 'kick' ? G.red : '#FF7A1A',
                                    color: '#FFFFFF', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                                    opacity: isActioning ? 0.6 : 1
                                }}>
                                {isActioning ? '...' : confirmAction.type === 'kick' ? 'Loại' : 'Tạm dừng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit role modal */}
            {editing && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--content-left-offset, 0px)', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={() => setEditing(null)}>
                    <div style={{ background: '#F4F7FB', border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 600, color: G.t1 }}>Đổi quyền thành viên</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {ROLE_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => setSelectedRole(opt.value)} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                                    background: selectedRole === opt.value ? roleBg(opt.value) : '#F8FAFC',
                                    border: `1px solid ${selectedRole === opt.value ? roleBorder(opt.value) : '#FFFFFF'}`,
                                    color: selectedRole === opt.value ? roleColor(opt.value) : G.t2,
                                    fontWeight: selectedRole === opt.value ? 600 : 400, fontSize: '14px',
                                }}>
                                    {opt.label}
                                    {selectedRole === opt.value && <span>✓</span>}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: 'transparent', color: G.t2, fontWeight: 500, cursor: 'pointer' }}>Huỷ</button>
                            <button onClick={handleUpdateRole} disabled={isUpdating} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: G.accent, color: '#FFFFFF', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: isUpdating ? 0.6 : 1 }}>
                                {isUpdating ? '...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
