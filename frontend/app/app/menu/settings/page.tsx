'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/useToast'
import { useApi } from '@/hooks/useApi'
import { PasswordChangeModal } from '@/components/Common/PasswordChangeModal'
import { ArrowLeft } from 'phosphor-react'

const G = {
    bg: '#070B14',
    glass: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F',
    accentDim: 'rgba(0,214,143,0.12)',
    t1: '#F0F4FF',
    t2: 'rgba(240,244,255,0.55)',
    t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B',
}

export default function SettingsPage() {
    const router = useRouter()
    const { user, team, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { updateProfile, changePassword } = useProfile()
    const { request: apiRequest } = useApi()

    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [jerseyNumber, setJerseyNumber] = useState('')

    const [editingField, setEditingField] = useState<string | null>(null)
    const [savingField, setSavingField] = useState<string | null>(null)
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [changePasswordLoading, setChangePasswordLoading] = useState(false)

    // Load user data
    useEffect(() => {
        if (authLoading || !user) return
        setFullName((user as any)?.full_name || user?.name || '')
        setPhone((user as any)?.phone || '')
    }, [user, authLoading])

    const handleProfileFieldSave = async (field: string, value: string) => {
        if (!value || value.trim() === '') {
            toast('Giá trị không được bỏ trống', 'error')
            return
        }

        setSavingField(field)
        try {
            await updateProfile({
                ...(field === 'fullName' && { full_name: value }),
                ...(field === 'phone' && { phone: value }),
            })
            toast('Đã lưu thành công', 'success')
            setEditingField(null)
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Lỗi lưu dữ liệu', 'error')
        } finally {
            setSavingField(null)
        }
    }

    const handleJerseyNumberSave = async () => {
        if (!team?.id) return

        const jerseyNum = jerseyNumber ? parseInt(jerseyNumber, 10) : null

        if (jerseyNum !== null && (jerseyNum <= 0 || !Number.isInteger(jerseyNum))) {
            toast('Số áo phải là số nguyên dương', 'error')
            return
        }

        setSavingField('jersey')
        try {
            await apiRequest('/members/jersey-number', 'PUT', {
                team_id: team.id,
                jersey_number: jerseyNum,
            })
            toast('Đã lưu số áo', 'success')
            setEditingField(null)
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Lỗi lưu số áo', 'error')
        } finally {
            setSavingField(null)
        }
    }

    const handlePasswordChange = async (data: {
        current_password: string
        new_password: string
        new_password_confirm: string
    }) => {
        setChangePasswordLoading(true)
        try {
            await changePassword(data)
            toast('Đã đổi mật khẩu thành công', 'success')
        } catch (err) {
            throw err
        } finally {
            setChangePasswordLoading(false)
        }
    }

    if (authLoading) {
        return <div style={{ color: G.t1, padding: '24px' }}>Đang tải...</div>
    }

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: G.accent,
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: G.t1 }}>Cài đặt cá nhân</h1>
            </div>

            {/* Profile Section */}
            <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: G.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                    Thông tin cơ bản
                </p>

                {/* Full Name */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', color: G.t2, fontWeight: 500 }}>Họ và tên</label>
                        {editingField !== 'fullName' && (
                            <button
                                onClick={() => setEditingField('fullName')}
                                style={{ background: 'none', border: 'none', color: G.accent, cursor: 'pointer', fontSize: '12px' }}
                            >
                                Sửa
                            </button>
                        )}
                    </div>
                    {editingField === 'fullName' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: G.glass,
                                    border: `1px solid ${G.accent}`,
                                    borderRadius: '8px',
                                    color: G.t1,
                                    fontSize: '14px',
                                }}
                            />
                            <button
                                onClick={() => handleProfileFieldSave('fullName', fullName)}
                                disabled={savingField === 'fullName'}
                                style={{
                                    padding: '10px 16px',
                                    background: 'rgba(0,214,143,0.20)',
                                    border: `1px solid ${G.accent}`,
                                    borderRadius: '8px',
                                    color: G.accent,
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: savingField === 'fullName' ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {savingField === 'fullName' ? 'Lưu...' : 'Lưu'}
                            </button>
                        </div>
                    ) : (
                        <p style={{ margin: 0, padding: '10px 12px', background: G.glass, borderRadius: '8px', color: G.t1, fontSize: '14px' }}>
                            {fullName || 'Chưa cập nhật'}
                        </p>
                    )}
                </div>

                {/* Email (read-only) */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', color: G.t2, fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                        Email (không thể đổi)
                    </label>
                    <p
                        style={{
                            margin: 0,
                            padding: '10px 12px',
                            background: G.glass,
                            borderRadius: '8px',
                            color: G.t3,
                            fontSize: '14px',
                            opacity: 0.6,
                        }}
                    >
                        {user?.email || '---'}
                    </p>
                </div>

                {/* Phone */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', color: G.t2, fontWeight: 500 }}>Số điện thoại</label>
                        {editingField !== 'phone' && (
                            <button
                                onClick={() => setEditingField('phone')}
                                style={{ background: 'none', border: 'none', color: G.accent, cursor: 'pointer', fontSize: '12px' }}
                            >
                                Sửa
                            </button>
                        )}
                    </div>
                    {editingField === 'phone' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: G.glass,
                                    border: `1px solid ${G.accent}`,
                                    borderRadius: '8px',
                                    color: G.t1,
                                    fontSize: '14px',
                                }}
                                placeholder="+84..."
                            />
                            <button
                                onClick={() => handleProfileFieldSave('phone', phone)}
                                disabled={savingField === 'phone'}
                                style={{
                                    padding: '10px 16px',
                                    background: 'rgba(0,214,143,0.20)',
                                    border: `1px solid ${G.accent}`,
                                    borderRadius: '8px',
                                    color: G.accent,
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: savingField === 'phone' ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {savingField === 'phone' ? 'Lưu...' : 'Lưu'}
                            </button>
                        </div>
                    ) : (
                        <p style={{ margin: 0, padding: '10px 12px', background: G.glass, borderRadius: '8px', color: G.t1, fontSize: '14px' }}>
                            {phone || 'Chưa cập nhật'}
                        </p>
                    )}
                </div>
            </div>

            {/* Team Info Section */}
            {team && (
                <div style={{ marginBottom: '32px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: G.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                        Thông tin đội
                    </p>

                    {/* Jersey Number */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', color: G.t2, fontWeight: 500 }}>Số áo</label>
                            {editingField !== 'jersey' && (
                                <button
                                    onClick={() => setEditingField('jersey')}
                                    style={{ background: 'none', border: 'none', color: G.accent, cursor: 'pointer', fontSize: '12px' }}
                                >
                                    Sửa
                                </button>
                            )}
                        </div>
                        {editingField === 'jersey' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    value={jerseyNumber}
                                    onChange={(e) => setJerseyNumber(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        background: G.glass,
                                        border: `1px solid ${G.accent}`,
                                        borderRadius: '8px',
                                        color: G.t1,
                                        fontSize: '14px',
                                    }}
                                    placeholder="Nhập số áo"
                                    min="1"
                                />
                                <button
                                    onClick={() => handleJerseyNumberSave()}
                                    disabled={savingField === 'jersey'}
                                    style={{
                                        padding: '10px 16px',
                                        background: 'rgba(0,214,143,0.20)',
                                        border: `1px solid ${G.accent}`,
                                        borderRadius: '8px',
                                        color: G.accent,
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: savingField === 'jersey' ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {savingField === 'jersey' ? 'Lưu...' : 'Lưu'}
                                </button>
                            </div>
                        ) : (
                            <p style={{ margin: 0, padding: '10px 12px', background: G.glass, borderRadius: '8px', color: G.t1, fontSize: '14px' }}>
                                {jerseyNumber || 'Chưa cập nhật'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Security Section */}
            <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: G.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                    Bảo mật
                </p>

                <button
                    onClick={() => setPasswordModalOpen(true)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(0,214,143,0.12)',
                        border: `1px solid ${G.glassBorder}`,
                        borderRadius: '10px',
                        color: G.accent,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                    }}
                >
                    🔐 Đổi mật khẩu
                </button>
            </div>

            {/* Password Modal */}
            <PasswordChangeModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
                onSubmit={handlePasswordChange}
                isLoading={changePasswordLoading}
            />
        </div>
    )
}
