'use client'

import React, { useState } from 'react'

const G = {
    glass: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F',
    t1: '#F0F4FF',
    t2: 'rgba(240,244,255,0.55)',
    t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B',
}

interface PasswordChangeModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: {
        current_password: string
        new_password: string
        new_password_confirm: string
    }) => Promise<void>
    isLoading?: boolean
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
}) => {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Frontend validation
        if (!currentPassword) {
            setError('Nhập mật khẩu hiện tại')
            return
        }
        if (!newPassword || newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp')
            return
        }
        if (currentPassword === newPassword) {
            setError('Mật khẩu mới phải khác mật khẩu hiện tại')
            return
        }

        try {
            await onSubmit({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirm: confirmPassword,
            })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999,
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#1A1F2E',
                    border: `1px solid ${G.glassBorder}`,
                    borderRadius: '16px',
                    padding: '24px',
                    width: 'min(90%, 400px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 1000,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
            >
                <h2
                    style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: G.t1,
                        margin: '0 0 20px 0',
                    }}
                >
                    Đổi mật khẩu
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Current Password */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: G.t2,
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Mật khẩu hiện tại
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: G.glass,
                                border: `1px solid ${G.glassBorder}`,
                                borderRadius: '10px',
                                color: G.t1,
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    {/* New Password */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: G.t2,
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Mật khẩu mới
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: G.glass,
                                border: `1px solid ${G.glassBorder}`,
                                borderRadius: '10px',
                                color: G.t1,
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: G.t2,
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Xác nhận mật khẩu
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: G.glass,
                                border: `1px solid ${G.glassBorder}`,
                                borderRadius: '10px',
                                color: G.t1,
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div
                            style={{
                                padding: '12px',
                                background: 'rgba(255,107,107,0.15)',
                                border: `1px solid rgba(255,107,107,0.30)`,
                                borderRadius: '8px',
                                color: '#FF9999',
                                fontSize: '13px',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'transparent',
                                border: `1px solid ${G.glassBorder}`,
                                borderRadius: '10px',
                                color: G.t2,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'rgba(0,214,143,0.20)',
                                border: `1px solid ${G.accent}`,
                                borderRadius: '10px',
                                color: G.accent,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            {isLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}
