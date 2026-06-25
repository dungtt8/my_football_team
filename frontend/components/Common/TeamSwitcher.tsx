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

export const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ isOpen, onClose }) => {
    const { team, allTeams, switchTeam, isLoading, user } = useAuthContext()
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSwitchTeam = async (teamId: string) => {
        try {
            setError(null)
            await switchTeam(teamId)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi chuyển đội')
        }
    }

    const handleCreateTeam = () => {
        onClose()
        router.push('/onboarding/create')
    }

    return (
        <>
            {/* Overlay */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    zIndex: 40,
                    transition: 'opacity 0.2s ease',
                }}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    insetInline: 0,
                    bottom: 0,
                    zIndex: 50,
                    backgroundColor: '#070B14',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideUp 0.3s ease',
                    border: `1px solid ${G.glassBorder}`,
                    borderBottom: 'none',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        borderBottom: `1px solid ${G.glassBorder}`,
                    }}
                >
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '4px' }}>
                            Chuyển đội
                        </p>
                        <h2 style={{ fontSize: '20px', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Chọn đội</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '10px',
                            color: G.t1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s ease',
                            flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = G.glass)}
                        aria-label="Đóng"
                    >
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Team List */}
                <div
                    style={{
                        overflowY: 'auto',
                        flex: 1,
                        padding: '16px',
                    }}
                >
                    {error && (
                        <div
                            style={{
                                marginBottom: '12px',
                                padding: '12px',
                                background: G.redDim,
                                border: `1px solid ${G.red}25`,
                                borderRadius: '12px',
                                fontSize: '13px',
                                color: G.red,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {allTeams.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 16px', color: G.t3 }}>
                            <p style={{ fontSize: '14px', margin: 0 }}>🤔 Bạn chưa có đội nào</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {allTeams.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleSwitchTeam(t.id)}
                                    disabled={isLoading || t.id === team?.id}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '14px',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease',
                                        border: `1px solid ${t.id === team?.id ? G.accent : G.glassBorder}`,
                                        background: t.id === team?.id ? G.blueDim : G.glass,
                                        cursor: isLoading || t.id === team?.id ? 'default' : 'pointer',
                                        opacity: isLoading ? 0.6 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading && t.id !== team?.id) {
                                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
                                                ; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (t.id !== team?.id) {
                                            (e.currentTarget as HTMLButtonElement).style.background = G.glass
                                                ; (e.currentTarget as HTMLButtonElement).style.borderColor = G.glassBorder
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 600, fontSize: '14px', color: G.t1, margin: '0 0 4px 0' }}>
                                                {t.name}
                                            </p>
                                            <p style={{ fontSize: '12px', color: G.t3, margin: 0, textTransform: 'capitalize' }}>
                                                {t.role === 'owner' ? 'Chủ đội' : t.role === 'co_manager' ? 'Phó quản lý' : 'Thành viên'}
                                            </p>
                                        </div>
                                        {t.id === team?.id && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '20px',
                                                    height: '20px',
                                                    marginLeft: '12px',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <svg width="20" height="20" fill={G.accent} viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer: Create Team Button + Team Count */}
                <div
                    style={{
                        borderTop: `1px solid ${G.glassBorder}`,
                        padding: '12px 16px',
                        background: G.glass,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}
                >
                    <button
                        onClick={handleCreateTeam}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: 'none',
                            background: isLoading ? 'rgba(0,214,143,0.5)' : G.accent,
                            color: '#070B14',
                            fontWeight: 600,
                            fontSize: '14px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: isLoading ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#00B876'
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = G.accent
                        }}
                    >
                        <span style={{ fontSize: '16px' }}>⚽</span>
                        Tạo đội mới
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '12px', color: G.t3 }}>
                        {allTeams.length} {allTeams.length === 1 ? 'đội' : 'đội'}
                    </div>
                </div>

                <style>{`
                    @keyframes slideUp {
                        from {
                            transform: translateY(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateY(0);
                            opacity: 1;
                        }
                    }
                `}</style>
            </div>
        </>
    )
}

export default TeamSwitcher
