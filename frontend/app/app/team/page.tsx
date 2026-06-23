'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useTeam, TeamMember } from '@/hooks/useTeam'
import { useToast } from '@/hooks/useToast'

const G = {
    glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)',
    blue: '#4A7CFF', blueDim: 'rgba(74,124,255,0.12)',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B', redDim: 'rgba(255,107,107,0.12)',
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
    r === 'owner' ? G.accentDim : r === 'co_manager' ? G.blueDim : 'rgba(255,255,255,0.05)'
const roleBorder = (r: string) =>
    r === 'owner' ? 'rgba(0,214,143,0.25)' : r === 'co_manager' ? 'rgba(74,124,255,0.25)' : G.glassBorder

export default function TeamMembersPage() {
    const router = useRouter()
    const { user, role } = useAuth()
    const { toast } = useToast()
    const { listMembers, updateMemberRole, loading } = useTeam()
    const isOwner = role === 'owner'

    const [members, setMembers] = useState<TeamMember[]>([])
    const [editing, setEditing] = useState<{ id: number; currentRole: string } | null>(null)
    const [selectedRole, setSelectedRole] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

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

    const initials = (name: string) => name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px', color: G.t1 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => router.back()} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t1, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '4px' }}>Đội bóng</p>
                        <h1 style={{ fontSize: '24px', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Quản lý thành viên</h1>
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
                                border: `1px solid ${isMe ? 'rgba(0,214,143,0.20)' : G.glassBorder}`,
                                borderRadius: '16px', backdropFilter: 'blur(12px)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                        background: m.role === 'owner' ? 'linear-gradient(135deg, #00D68F, #00A36C)' : m.role === 'co_manager' ? 'linear-gradient(135deg, #4A7CFF, #3056CC)' : 'rgba(255,255,255,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '14px', fontWeight: 700, color: m.role === 'member' ? G.t2 : '#070B14',
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
                                        <button onClick={() => openEdit(m)} style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${G.glassBorder}`, color: G.t2, fontSize: '12px', cursor: 'pointer' }}>
                                            Sửa
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Edit role modal */}
            {editing && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={() => setEditing(null)}>
                    <div style={{ background: '#0E1628', border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '360px' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 600, color: G.t1 }}>Đổi quyền thành viên</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {ROLE_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => setSelectedRole(opt.value)} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                                    background: selectedRole === opt.value ? roleBg(opt.value) : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${selectedRole === opt.value ? roleBorder(opt.value) : 'rgba(255,255,255,0.07)'}`,
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
                            <button onClick={handleUpdateRole} disabled={isUpdating} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: G.accent, color: '#070B14', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: isUpdating ? 0.6 : 1 }}>
                                {isUpdating ? '...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
