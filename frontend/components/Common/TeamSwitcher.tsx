'use client'

import React, { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export interface TeamSwitcherProps {
    isOpen: boolean
    onClose: () => void
}

const G = {
    glass: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F',
    accentDim: 'rgba(0,214,143,0.12)',
    blue: '#4A7CFF',
    blueDim: 'rgba(74,124,255,0.12)',
    t1: '#F0F4FF',
    t2: 'rgba(240,244,255,0.55)',
    t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B',
    redDim: 'rgba(255,107,107,0.12)',
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    owner:      { label: 'Chủ đội',     color: '#F6AD55', bg: 'rgba(246,173,85,0.12)' },
    co_manager: { label: 'Phó quản lý', color: G.blue,    bg: G.blueDim },
    member:     { label: 'Thành viên',  color: G.t3,      bg: 'rgba(255,255,255,0.05)' },
}

export const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ isOpen, onClose }) => {
    const { team, allTeams, switchTeam, isLoading, user } = useAuthContext()
    const router = useRouter()
    const [switchingId, setSwitchingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSwitchTeam = async (teamId: string) => {
        if (teamId === team?.id) return
        try {
            setError(null)
            setSwitchingId(teamId)
            await switchTeam(teamId)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi chuyển đội')
        } finally {
            setSwitchingId(null)
        }
    }

    const initials = (name: string) => name.trim().charAt(0).toUpperCase()

    return (
        <>
            {/* Overlay */}
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(4px)' }}
                onClick={onClose} />

            {/* Sheet */}
            <div style={{
                position: 'fixed', insetInline: 0, bottom: 0, zIndex: 50,
                backgroundColor: '#0A0F1E',
                borderTop: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '24px 24px 0 0',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
                maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
                {/* Handle bar */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                    <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
                </div>

                {/* Header */}
                <div style={{ padding: '8px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent }}>Đội bóng</p>
                        <h2 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 300, fontFamily: 'serif', color: G.t1 }}>Chuyển đội</h2>
                    </div>
                    <button onClick={onClose} style={{ width: '34px', height: '34px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, background: G.glass, color: G.t2, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: G.redDim, border: `1px solid rgba(255,107,107,0.2)`, borderRadius: '10px', fontSize: '13px', color: G.red }}>
                        {error}
                    </div>
                )}

                {/* Team list */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 8px' }}>
                    {allTeams.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: G.t3 }}>
                            <p style={{ fontSize: '32px', margin: '0 0 8px' }}>🤔</p>
                            <p style={{ fontSize: '14px', margin: 0 }}>Bạn chưa có đội nào</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {allTeams.map((t) => {
                                const isActive = t.id === team?.id
                                const isSwitching = switchingId === t.id
                                const role = ROLE_CONFIG[t.role ?? 'member'] ?? ROLE_CONFIG.member
                                return (
                                    <button key={t.id} onClick={() => handleSwitchTeam(t.id)}
                                        disabled={isActive || !!switchingId}
                                        style={{
                                            width: '100%', padding: '12px 14px', borderRadius: '14px',
                                            textAlign: 'left', cursor: isActive ? 'default' : switchingId ? 'wait' : 'pointer',
                                            border: `1px solid ${isActive ? G.accent : G.glassBorder}`,
                                            background: isActive ? 'rgba(0,214,143,0.08)' : G.glass,
                                            opacity: switchingId && !isSwitching ? 0.5 : 1,
                                            transition: 'all 0.15s',
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                        }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                                            background: isActive ? 'rgba(0,214,143,0.15)' : 'rgba(255,255,255,0.06)',
                                            border: `1px solid ${isActive ? 'rgba(0,214,143,0.3)' : G.glassBorder}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '16px', fontWeight: 700,
                                            color: isActive ? G.accent : G.t2,
                                        }}>
                                            {isSwitching ? (
                                                <span style={{ fontSize: '12px', animation: 'spin 1s linear infinite' }}>⟳</span>
                                            ) : initials(t.name)}
                                        </div>

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.name}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 7px', borderRadius: '20px', background: role.bg, color: role.color }}>
                                                    {role.label}
                                                </span>
                                                {isActive && (
                                                    <span style={{ fontSize: '11px', color: G.accent, fontWeight: 500 }}>· Đang dùng</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Check */}
                                        {isActive && (
                                            <svg width="18" height="18" fill={G.accent} viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 16px 28px', borderTop: `1px solid ${G.glassBorder}`, display: 'flex', gap: '10px' }}>
                    <button onClick={() => { onClose(); router.push('/onboarding/join') }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: G.glass, color: G.t2, fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                        🔗 Tham gia đội
                    </button>
                    <button onClick={() => { onClose(); router.push('/onboarding/create') }}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: G.accent, color: '#070B14', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                        ⚽ Tạo đội mới
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </>
    )
}

export default TeamSwitcher
