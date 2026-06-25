'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { Gear, Clock, CurrencyDollar, CalendarPlus, Copy, CheckCircle, Calendar } from 'phosphor-react'

const G = {
    glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)',
    blue: '#4A7CFF', blueDim: 'rgba(74,124,255,0.12)',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B', redDim: 'rgba(255,107,107,0.12)',
}

type TabType = 'general' | 'attendance' | 'finance' | 'fund' | 'scheduling' | 'invite'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface TeamSettings {
    team_name?: string
    team_description?: string
    attendance_enabled?: boolean
    attendance_schedule?: string // JSON: { day: number (0-6), time: string }[]
    attendance_cooldown?: number // minutes before can check in
    fund_closing_day?: number // day of month
    fund_closing_time?: string // HH:mm
    fund_payment_start_day?: number // day of month (1-31) for payment deadline
    fund_payment_end_day?: number // day of month (1-31) for payment deadline
    bank_account_number?: string
    bank_name?: string
    fund_qr_code_url?: string
    max_members?: number
    auto_create_sessions?: boolean
    session_frequency?: 'disabled' | 'daily' | 'weekly' | 'custom'
    session_days?: string // 'mon,wed,fri'
    session_time?: string // HH:mm
    session_type?: 'training' | 'match' | 'both'
    session_location?: string
    auto_session_creation_time?: string // HH:mm UTC
    checkin_creation_day?: string // mon-sun
    checkin_creation_time?: string // HH:mm UTC
    checkin_start_day?: string // mon-sun
    checkin_end_day?: string // mon-sun
}

export default function TeamSettingsPage() {
    const router = useRouter()
    const { user, role, team } = useAuth()
    const { toast } = useToast()
    const isOwner = role === 'owner'

    const [tab, setTab] = useState<TabType>('general')
    const [loading, setLoading] = useState(false)
    const [inviteCode, setInviteCode] = useState<string>('')
    const [loadingInvite, setLoadingInvite] = useState(false)
    const [copied, setCopied] = useState(false)

    const [settings, setSettings] = useState<TeamSettings>({
        team_name: team?.name || '',
        attendance_enabled: true,
        fund_closing_day: 1,
        fund_closing_time: '23:59',
        fund_payment_start_day: undefined,
        fund_payment_end_day: undefined,
        bank_account_number: '',
        bank_name: '',
        fund_qr_code_url: '',
        auto_session_creation_time: '03:00',
        checkin_creation_day: 'mon',
        checkin_creation_time: '20:00',
        checkin_start_day: 'fri',
        checkin_end_day: 'tue',
    })

    const [schedule, setSchedule] = useState<Array<{ day: number; time: string }>>([])

    useEffect(() => {
        // Load team settings
        loadSettings()
    }, [team])

    const loadSettings = async () => {
        try {
            const token = localStorage.getItem('auth_token')
            const res = await fetch(`${API_URL}/team/settings`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setSettings({
                    team_name: data.general?.name || team?.name || '',
                    team_description: data.general?.description || '',
                    attendance_enabled: data.attendance?.enabled !== false,
                    attendance_cooldown: data.attendance?.cooldown_minutes || 5,
                    fund_closing_day: data.finance?.closing_day || 1,
                    fund_closing_time: data.finance?.closing_time || '23:59',
                    fund_payment_start_day: data.finance?.payment_start_day,
                    fund_payment_end_day: data.finance?.payment_end_day,
                    bank_account_number: data.fund?.bank_account_number || '',
                    bank_name: data.fund?.bank_name || '',
                    fund_qr_code_url: data.fund?.qr_code_url || '',
                    auto_create_sessions: data.scheduling?.auto_create_sessions || false,
                    session_frequency: data.scheduling?.session_frequency || 'disabled',
                    session_days: data.scheduling?.session_days || '',
                    session_time: data.scheduling?.session_time || '18:00',
                    session_type: data.scheduling?.session_type || 'training',
                    session_location: data.scheduling?.session_location || '',
                    auto_session_creation_time: data.scheduling?.auto_session_creation_time || '03:00',
                    checkin_creation_day: data.scheduling?.checkin_creation_day || 'mon',
                    checkin_creation_time: data.scheduling?.checkin_creation_time || '20:00',
                    checkin_start_day: data.scheduling?.checkin_start_day || 'fri',
                    checkin_end_day: data.scheduling?.checkin_end_day || 'tue',
                })
                const code = data.invite?.code
                setInviteCode(code || '')
                // Auto-generate invite code if empty
                if (!code && isOwner) {
                    handleRegenerateInvite()
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
        }
    }

    const handleRegenerateInvite = async () => {
        setLoadingInvite(true)
        try {
            const token = localStorage.getItem('auth_token')
            const res = await fetch(`${API_URL}/team/invite/regenerate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setInviteCode(data.invite_code)
                toast('Đã tạo mã mời', 'success')
            }
        } catch (error) {
            console.error('Failed to regenerate invite code:', error)
            toast('Lỗi tạo mã mời', 'error')
        } finally {
            setLoadingInvite(false)
        }
    }

    const handleCopyInvite = () => {
        if (!inviteCode) {
            toast('Chưa có mã mời, vui lòng tạo mới', 'error')
            return
        }
        const inviteUrl = `${window.location.origin}/onboarding/join?code=${inviteCode}`
        navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        toast('Đã copy link mời', 'success')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSaveSettings = async () => {
        if (!isOwner) {
            toast('Chỉ chủ đội mới có quyền thay đổi cài đặt', 'error')
            return
        }
        setLoading(true)
        try {
            const token = localStorage.getItem('auth_token')
            const payload: any = {};

            if (tab === 'general') {
                payload.general = {
                    name: settings.team_name,
                    description: settings.team_description,
                }
            } else if (tab === 'attendance') {
                payload.attendance = {
                    enabled: settings.attendance_enabled,
                    cooldown_minutes: settings.attendance_cooldown,
                }
            } else if (tab === 'finance') {
                payload.finance = {
                    closing_day: settings.fund_closing_day,
                    closing_time: settings.fund_closing_time,
                    payment_start_day: settings.fund_payment_start_day || null,
                    payment_end_day: settings.fund_payment_end_day || null,
                }
            } else if (tab === 'fund') {
                payload.fund = {
                    bank_account_number: settings.bank_account_number || null,
                    bank_name: settings.bank_name || null,
                    qr_code_url: settings.fund_qr_code_url || null,
                }
            } else if (tab === 'scheduling') {
                payload.scheduling = {
                    auto_create_sessions: settings.auto_create_sessions,
                    session_frequency: settings.session_frequency,
                    session_days: settings.session_days,
                    session_time: settings.session_time,
                    session_type: settings.session_type,
                    session_location: settings.session_location,
                    auto_session_creation_time: settings.auto_session_creation_time,
                    checkin_creation_day: settings.checkin_creation_day,
                    checkin_creation_time: settings.checkin_creation_time,
                    checkin_start_day: settings.checkin_start_day,
                    checkin_end_day: settings.checkin_end_day,
                }
            }

            const res = await fetch(`${API_URL}/team/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Lỗi lưu cài đặt')
            }

            const data = await res.json()
            // Update settings with response data
            if (data.general) {
                setSettings((prev) => ({ ...prev, team_name: data.general.name, team_description: data.general.description }))
            }
            if (data.attendance) {
                setSettings((prev) => ({ ...prev, attendance_enabled: data.attendance.enabled, attendance_cooldown: data.attendance.cooldown_minutes }))
            }
            if (data.finance) {
                setSettings((prev) => ({ ...prev, fund_closing_day: data.finance.closing_day, fund_closing_time: data.finance.closing_time, fund_payment_start_day: data.finance.payment_start_day, fund_payment_end_day: data.finance.payment_end_day }))
            }
            if (data.fund) {
                setSettings((prev) => ({ ...prev, bank_account_number: data.fund.bank_account_number, bank_name: data.fund.bank_name, fund_qr_code_url: data.fund.qr_code_url }))
            }
            if (data.scheduling) {
                setSettings((prev) => ({ ...prev, auto_create_sessions: data.scheduling.auto_create_sessions, session_frequency: data.scheduling.session_frequency, session_days: data.scheduling.session_days, session_time: data.scheduling.session_time, session_type: data.scheduling.session_type, session_location: data.scheduling.session_location, auto_session_creation_time: data.scheduling.auto_session_creation_time, checkin_creation_day: data.scheduling.checkin_creation_day, checkin_creation_time: data.scheduling.checkin_creation_time, checkin_start_day: data.scheduling.checkin_start_day, checkin_end_day: data.scheduling.checkin_end_day }))
            }

            toast('Cài đặt đã được lưu', 'success')
        } catch (e: any) {
            toast(e?.message || 'Lỗi lưu cài đặt', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', padding: '16px 12px', paddingTop: '88px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={() => router.back()} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t1, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>‹</button>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '4px' }}>Cấu hình</p>
                    <h1 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Cài Đặt Đội</h1>
                </div>
            </div>

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '8px', scrollBehavior: 'smooth' }}>
                {[
                    { id: 'general', label: 'Thông tin', icon: <Gear size={14} /> },
                    { id: 'attendance', label: 'Điểm danh', icon: <Clock size={14} /> },
                    { id: 'finance', label: 'Tài chính', icon: <CurrencyDollar size={14} /> },
                    { id: 'fund', label: 'Quỹ', icon: <CurrencyDollar size={14} /> },
                    { id: 'scheduling', label: 'Lịch', icon: <Calendar size={14} /> },
                    { id: 'invite', label: 'Mời', icon: <CalendarPlus size={14} /> },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as TabType)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: tab === t.id ? 600 : 500,
                            border: 'none',
                            cursor: 'pointer',
                            background: tab === t.id ? G.accent : G.glass,
                            color: tab === t.id ? '#070B14' : G.t2,
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ maxWidth: '600px' }}>
                {/* General Settings */}
                {tab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Tên đội
                            </label>
                            <input
                                type="text"
                                value={settings.team_name}
                                onChange={(e) => setSettings({ ...settings, team_name: e.target.value })}
                                placeholder="Tên đội bóng"
                                disabled={!isOwner}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    opacity: isOwner ? 1 : 0.6,
                                }}
                            />
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Mô tả
                            </label>
                            <textarea
                                value={settings.team_description}
                                onChange={(e) => setSettings({ ...settings, team_description: e.target.value })}
                                placeholder="Giới thiệu về đội..."
                                disabled={!isOwner}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    resize: 'none',
                                    opacity: isOwner ? 1 : 0.6,
                                }}
                            />
                        </div>

                        {isOwner && (
                            <button
                                onClick={handleSaveSettings}
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: G.accent,
                                    color: '#070B14',
                                    fontWeight: 600,
                                    cursor: loading ? 'default' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? 'Đang lưu...' : '✓ Lưu thay đổi'}
                            </button>
                        )}
                    </div>
                )}

                {/* Attendance Settings */}
                {tab === 'attendance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <label style={{ fontSize: '14px', fontWeight: 600, color: G.t1 }}>Bật điểm danh</label>
                                <input
                                    type="checkbox"
                                    checked={settings.attendance_enabled}
                                    onChange={(e) => setSettings({ ...settings, attendance_enabled: e.target.checked })}
                                    disabled={!isOwner}
                                    style={{ width: '18px', height: '18px', cursor: isOwner ? 'pointer' : 'default', opacity: isOwner ? 1 : 0.6 }}
                                />
                            </div>

                            {settings.attendance_enabled && (
                                <>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                        Thời gian chờ trước khi check-in (phút)
                                    </label>
                                    <input
                                        type="number"
                                        value={settings.attendance_cooldown || 5}
                                        onChange={(e) => setSettings({ ...settings, attendance_cooldown: parseInt(e.target.value) })}
                                        disabled={!isOwner}
                                        min="1"
                                        max="60"
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${G.glassBorder}`,
                                            color: G.t1,
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            marginBottom: '12px',
                                            opacity: isOwner ? 1 : 0.6,
                                        }}
                                    />
                                    <p style={{ fontSize: '12px', color: G.t3, margin: '8px 0 0 0' }}>
                                        ℹ️ Thành viên phải check-in trong khoảng thời gian này
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Finance Settings */}
                {tab === 'finance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Ngày đóng quỹ (hằng tháng)
                            </label>
                            <input
                                type="number"
                                value={settings.fund_closing_day}
                                onChange={(e) => setSettings({ ...settings, fund_closing_day: parseInt(e.target.value) })}
                                disabled={!isOwner}
                                min="1"
                                max="31"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    marginBottom: '12px',
                                    opacity: isOwner ? 1 : 0.6,
                                }}
                            />
                            <p style={{ fontSize: '12px', color: G.t3, margin: 0 }}>
                                ℹ️ Tất cả giao dịch phải được duyệt trước ngày này
                            </p>
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Giờ đóng quỹ
                            </label>
                            <input
                                type="time"
                                value={settings.fund_closing_time}
                                onChange={(e) => setSettings({ ...settings, fund_closing_time: e.target.value })}
                                disabled={!isOwner}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    opacity: isOwner ? 1 : 0.6,
                                }}
                            />
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Thời hạn thanh toán quỹ: Từ ngày (trong tháng)
                            </label>
                            <input
                                type="number"
                                value={settings.fund_payment_start_day || ''}
                                onChange={(e) => setSettings({ ...settings, fund_payment_start_day: parseInt(e.target.value) || undefined })}
                                disabled={!isOwner}
                                min="1"
                                max="31"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    opacity: isOwner ? 1 : 0.6,
                                }}
                            />
                            <p style={{ fontSize: '12px', color: G.t3, margin: '8px 0 0 0' }}>
                                ℹ️ Ví dụ: 5 (ngày 5 hàng tháng)
                            </p>
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Thời hạn thanh toán quỹ: Đến ngày (trong tháng)
                            </label>
                            <input
                                type="number"
                                value={settings.fund_payment_end_day || ''}
                                onChange={(e) => setSettings({ ...settings, fund_payment_end_day: parseInt(e.target.value) || undefined })}
                                disabled={!isOwner}
                                min="1"
                                max="31"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    opacity: isOwner ? 1 : 0.6,
                                }}
                            />
                            <p style={{ fontSize: '12px', color: G.t3, margin: '8px 0 0 0' }}>
                                ℹ️ Ví dụ: 10 (ngày 10 hàng tháng)
                            </p>
                        </div>

                        {isOwner && (
                            <button
                                onClick={handleSaveSettings}
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: G.accent,
                                    color: '#070B14',
                                    fontWeight: 600,
                                    cursor: loading ? 'default' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? 'Đang lưu...' : '✓ Lưu thay đổi'}
                            </button>
                        )}
                    </div>
                )}

                {/* Fund Settings */}
                {tab === 'fund' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Số tài khoản ngân hàng
                            </label>
                            <input
                                type="text"
                                value={settings.bank_account_number || ''}
                                onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                                placeholder="VD: 123456789012"
                                disabled={!isOwner}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    opacity: isOwner ? 1 : 0.6,
                                }}
                            />
                            <p style={{ fontSize: '12px', color: G.t3, margin: '8px 0 0 0' }}>
                                Số tài khoản ngân hàng để nhận thanh toán quỹ
                            </p>
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Tên ngân hàng
                            </label>
                            <input
                                type="text"
                                value={settings.bank_name || ''}
                                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                                placeholder="VD: Vietcombank, Techcombank"
                                disabled={!isOwner}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    opacity: isOwner ? 1 : 0.6,
                                }}
                            />
                            <p style={{ fontSize: '12px', color: G.t3, margin: '8px 0 0 0' }}>
                                Tên ngân hàng nơi lưu tài khoản
                            </p>
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                Mã QR thanh toán
                            </label>
                            <input
                                type="text"
                                value={settings.fund_qr_code_url || ''}
                                onChange={(e) => setSettings({ ...settings, fund_qr_code_url: e.target.value })}
                                placeholder="Dán link ảnh mã QR (VD: https://...)"
                                disabled={!isOwner}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t1,
                                    fontSize: '13px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    opacity: isOwner ? 1 : 0.6,
                                    minHeight: '80px',
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-word',
                                }}
                            />
                            {settings.fund_qr_code_url && (
                                <img
                                    src={settings.fund_qr_code_url}
                                    alt="QR Code"
                                    style={{
                                        width: '100%',
                                        maxWidth: '200px',
                                        height: 'auto',
                                        aspectRatio: '1',
                                        borderRadius: '12px',
                                        marginTop: '12px',
                                        border: `1px solid ${G.glassBorder}`,
                                        objectFit: 'contain',
                                    }}
                                    onError={() => toast('Không thể tải ảnh QR', 'error')}
                                />
                            )}
                            <p style={{ fontSize: '12px', color: G.t3, margin: '8px 0 0 0' }}>
                                Link ảnh mã QR thanh toán (nếu có)
                            </p>
                        </div>

                        {isOwner && (
                            <button
                                onClick={handleSaveSettings}
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    background: loading ? G.t3 : G.accent,
                                    color: loading ? G.t2 : '#070B14',
                                    border: 'none',
                                    fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    transition: 'all 0.2s ease',
                                    opacity: loading ? 0.7 : 1,
                                    marginTop: '8px',
                                }}
                            >
                                {loading ? 'Đang lưu...' : '✓ Lưu thay đổi'}
                            </button>
                        )}
                    </div>
                )}

                {/* Scheduling Settings */}
                {tab === 'scheduling' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <label style={{ fontSize: '14px', fontWeight: 600, color: G.t1 }}>Tự động tạo sự kiện yêu cầu điểm danh</label>
                                <input
                                    type="checkbox"
                                    checked={settings.auto_create_sessions}
                                    onChange={(e) => setSettings({ ...settings, auto_create_sessions: e.target.checked })}
                                    disabled={!isOwner}
                                    style={{ width: '18px', height: '18px', cursor: isOwner ? 'pointer' : 'default', opacity: isOwner ? 1 : 0.6 }}
                                />
                            </div>

                            {settings.auto_create_sessions && (
                                <>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                        Tần suất
                                    </label>
                                    <select
                                        value={settings.session_frequency || 'disabled'}
                                        onChange={(e) => setSettings({ ...settings, session_frequency: e.target.value as any })}
                                        disabled={!isOwner}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${G.glassBorder}`,
                                            color: G.t1,
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            marginBottom: '16px',
                                            opacity: isOwner ? 1 : 0.6,
                                        }}
                                    >
                                        <option value="disabled">Vô hiệu hóa</option>
                                        <option value="daily">Hàng ngày</option>
                                        <option value="weekly">Hàng tuần</option>
                                    </select>

                                    {settings.session_frequency === 'weekly' && (
                                        <>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                                Chọn ngày
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                                                    const dayLabels: any = { mon: 'T2', tue: 'T3', wed: 'T4', thu: 'T5', fri: 'T6', sat: 'T7', sun: 'CN' };
                                                    const sessionDays = (settings.session_days || '').split(',').map((d) => d.trim());
                                                    const isSelected = sessionDays.includes(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            onClick={() => {
                                                                const days = (settings.session_days || '').split(',').map((d) => d.trim());
                                                                if (isSelected) {
                                                                    setSettings({ ...settings, session_days: days.filter((d) => d !== day).join(',') });
                                                                } else {
                                                                    setSettings({ ...settings, session_days: [...days, day].filter(Boolean).join(',') });
                                                                }
                                                            }}
                                                            disabled={!isOwner}
                                                            style={{
                                                                padding: '10px 16px',
                                                                borderRadius: '10px',
                                                                border: `2px solid ${isSelected ? G.accent : G.glassBorder}`,
                                                                background: isSelected ? 'rgba(0,214,143,0.1)' : 'transparent',
                                                                color: isSelected ? G.accent : G.t2,
                                                                fontWeight: isSelected ? 600 : 500,
                                                                cursor: isOwner ? 'pointer' : 'default',
                                                                opacity: isOwner ? 1 : 0.6,
                                                                fontSize: '13px',
                                                            }}
                                                        >
                                                            {dayLabels[day]}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}

                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                        Thời gian tạo sự kiện (giờ:phút)
                                    </label>
                                    <input
                                        type="time"
                                        value={settings.session_time || '18:00'}
                                        onChange={(e) => setSettings({ ...settings, session_time: e.target.value })}
                                        disabled={!isOwner}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${G.glassBorder}`,
                                            color: G.t1,
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            marginBottom: '16px',
                                            opacity: isOwner ? 1 : 0.6,
                                        }}
                                    />

                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                        Loại sự kiện
                                    </label>
                                    <select
                                        value={settings.session_type || 'training'}
                                        onChange={(e) => setSettings({ ...settings, session_type: e.target.value as any })}
                                        disabled={!isOwner}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${G.glassBorder}`,
                                            color: G.t1,
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            marginBottom: '16px',
                                            opacity: isOwner ? 1 : 0.6,
                                        }}
                                    >
                                        <option value="training">Tập luyện</option>
                                        <option value="match">Trận đấu</option>
                                        <option value="both">Cả hai</option>
                                    </select>

                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                        Địa điểm (tùy chọn)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.session_location || ''}
                                        onChange={(e) => setSettings({ ...settings, session_location: e.target.value })}
                                        disabled={!isOwner}
                                        placeholder="Sân bóng, địa chỉ..."
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${G.glassBorder}`,
                                            color: G.t1,
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            opacity: isOwner ? 1 : 0.6,
                                        }}
                                    />

                                    <label style={{ display: 'block', marginBottom: '8px', marginTop: '16px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                        Thời điểm chạy tự động (UTC)
                                    </label>
                                    <p style={{ fontSize: '11px', color: G.t3, marginBottom: '8px' }}>
                                        Giờ UTC (ví dụ: 03:00 = 10 sáng giờ Hà Nội)
                                    </p>
                                    <input
                                        type="time"
                                        value={settings.auto_session_creation_time || '03:00'}
                                        onChange={(e) => setSettings({ ...settings, auto_session_creation_time: e.target.value })}
                                        disabled={!isOwner}
                                        style={{
                                            width: '100%',
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${G.glassBorder}`,
                                            color: G.t1,
                                            fontSize: '14px',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            opacity: isOwner ? 1 : 0.6,
                                        }}
                                    />

                                    {/* Check-in Configuration Section */}
                                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: `1px solid ${G.glassBorder}` }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: G.t1, marginBottom: '16px' }}>
                                            Cài đặt điểm danh thành viên
                                        </h3>
                                        <p style={{ fontSize: '12px', color: G.t3, marginBottom: '16px' }}>
                                            Cấu hình khi nào tạo thông báo điểm danh và thành viên có bao lâu để báo tham gia
                                        </p>

                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                            Thứ tạo thông báo
                                        </label>
                                        <select
                                            value={settings.checkin_creation_day || 'mon'}
                                            onChange={(e) => setSettings({ ...settings, checkin_creation_day: e.target.value })}
                                            disabled={!isOwner}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${G.glassBorder}`,
                                                color: G.t1,
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                marginBottom: '16px',
                                                opacity: isOwner ? 1 : 0.6,
                                            }}
                                        >
                                            <option value="mon">Thứ 2 (Mon)</option>
                                            <option value="tue">Thứ 3 (Tue)</option>
                                            <option value="wed">Thứ 4 (Wed)</option>
                                            <option value="thu">Thứ 5 (Thu)</option>
                                            <option value="fri">Thứ 6 (Fri)</option>
                                            <option value="sat">Thứ 7 (Sat)</option>
                                            <option value="sun">Chủ nhật (Sun)</option>
                                        </select>

                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                            Giờ tạo thông báo (UTC)
                                        </label>
                                        <input
                                            type="time"
                                            value={settings.checkin_creation_time || '20:00'}
                                            onChange={(e) => setSettings({ ...settings, checkin_creation_time: e.target.value })}
                                            disabled={!isOwner}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${G.glassBorder}`,
                                                color: G.t1,
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                marginBottom: '16px',
                                                opacity: isOwner ? 1 : 0.6,
                                            }}
                                        />

                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                            Ngày bắt đầu cho phép điểm danh
                                        </label>
                                        <select
                                            value={settings.checkin_start_day || 'fri'}
                                            onChange={(e) => setSettings({ ...settings, checkin_start_day: e.target.value })}
                                            disabled={!isOwner}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${G.glassBorder}`,
                                                color: G.t1,
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                marginBottom: '16px',
                                                opacity: isOwner ? 1 : 0.6,
                                            }}
                                        >
                                            <option value="mon">Thứ 2 (Mon)</option>
                                            <option value="tue">Thứ 3 (Tue)</option>
                                            <option value="wed">Thứ 4 (Wed)</option>
                                            <option value="thu">Thứ 5 (Thu)</option>
                                            <option value="fri">Thứ 6 (Fri)</option>
                                            <option value="sat">Thứ 7 (Sat)</option>
                                            <option value="sun">Chủ nhật (Sun)</option>
                                        </select>

                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: G.t3 }}>
                                            Ngày kết thúc cho phép điểm danh
                                        </label>
                                        <select
                                            value={settings.checkin_end_day || 'tue'}
                                            onChange={(e) => setSettings({ ...settings, checkin_end_day: e.target.value })}
                                            disabled={!isOwner}
                                            style={{
                                                width: '100%',
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${G.glassBorder}`,
                                                color: G.t1,
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                opacity: isOwner ? 1 : 0.6,
                                            }}
                                        >
                                            <option value="mon">Thứ 2 (Mon)</option>
                                            <option value="tue">Thứ 3 (Tue)</option>
                                            <option value="wed">Thứ 4 (Wed)</option>
                                            <option value="thu">Thứ 5 (Thu)</option>
                                            <option value="fri">Thứ 6 (Fri)</option>
                                            <option value="sat">Thứ 7 (Sat)</option>
                                            <option value="sun">Chủ nhật (Sun)</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        {isOwner && settings.auto_create_sessions && (
                            <button
                                onClick={handleSaveSettings}
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: G.accent,
                                    color: '#070B14',
                                    fontWeight: 600,
                                    cursor: loading ? 'default' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? 'Đang lưu...' : '✓ Lưu thay đổi'}
                            </button>
                        )}
                    </div>
                )}

                {/* Invite Settings */}
                {tab === 'invite' && (
                    <div style={{
                        background: G.glass,
                        border: `1px solid ${G.glassBorder}`,
                        borderRadius: '16px',
                        padding: '20px',
                        backdropFilter: 'blur(12px)',
                    }}>
                        <p style={{ fontSize: '14px', color: G.t2, marginBottom: '16px' }}>
                            Chia sẻ link này với thành viên mới để họ tham gia đội
                        </p>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            borderRadius: '12px',
                            background: G.accentDim,
                            border: `1px solid rgba(0,214,143,0.25)`,
                            marginBottom: '12px',
                            flexWrap: 'wrap',
                        }}>
                            <input
                                type="text"
                                value={inviteCode ? `${window.location.origin}/onboarding/join?code=${inviteCode}` : ''}
                                readOnly
                                style={{
                                    flex: 1,
                                    minWidth: '150px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: G.t1,
                                    fontSize: '12px',
                                    outline: 'none',
                                    wordBreak: 'break-all',
                                }}
                            />
                            <button
                                onClick={handleCopyInvite}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: G.accent,
                                    color: '#070B14',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                                {copied ? 'Đã copy' : 'Copy'}
                            </button>
                        </div>

                        {isOwner && (
                            <button
                                onClick={handleRegenerateInvite}
                                disabled={loadingInvite}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    background: G.accent,
                                    border: 'none',
                                    color: '#070B14',
                                    cursor: loadingInvite ? 'default' : 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                    opacity: loadingInvite ? 0.6 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    if (!loadingInvite) (e.currentTarget as any).style.opacity = '0.8';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as any).style.opacity = loadingInvite ? '0.6' : '1';
                                }}
                            >
                                {loadingInvite ? 'Đang tạo...' : '🔄 Tạo mã mời mới'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Info box */}
            {!isOwner && (
                <div style={{
                    marginTop: '20px',
                    padding: '12px 14px',
                    background: 'rgba(255,165,0,0.1)',
                    border: '1px solid rgba(255,165,0,0.25)',
                    borderRadius: '12px',
                    color: '#FFA500',
                    fontSize: '12px',
                    lineHeight: '1.4',
                }}
                >
                    ⚠️ Chỉ chủ đội mới có quyền thay đổi các cài đặt này
                </div>
            )}
        </div>
    )
}
