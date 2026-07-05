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

type TabType = 'general' | 'finance' | 'scheduling' | 'invite' | 'attendance'

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
    auto_session_creation_time?: string // HH:mm GMT+7 (user display), stored as UTC in backend
    checkin_creation_day?: string // mon-sun
    checkin_creation_time?: string // HH:mm GMT+7 (user display), stored as UTC in backend
    checkin_start_day?: string // mon-sun
    checkin_end_day?: string // mon-sun
    checkin_deadline_time?: string // HH:mm GMT+7 (user display), stored as UTC in backend
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
        checkin_deadline_time: '20:00',
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
                    // NOTE: backend already converts UTC -> GMT+7 before sending this response
                    // (see teamHandler.js getSettings). Do NOT convert again here — doing so
                    // previously caused a double-conversion bug (e.g. 23:15 becoming 09:15 in
                    // the DB after a round trip through both layers).
                    auto_session_creation_time: data.scheduling?.auto_session_creation_time || '10:00',
                    checkin_creation_day: data.scheduling?.checkin_creation_day || 'mon',
                    checkin_creation_time: data.scheduling?.checkin_creation_time || '20:00',
                    checkin_start_day: data.scheduling?.checkin_start_day || 'fri',
                    checkin_end_day: data.scheduling?.checkin_end_day || 'tue',
                    checkin_deadline_time: data.scheduling?.checkin_deadline_time || '20:00',
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
                    checkin_creation_day: settings.checkin_creation_day,
                    // Sent as-is (GMT+7, what the user typed) — backend is the single
                    // place that converts to UTC before storing. Do not convert here too.
                    checkin_creation_time: settings.checkin_creation_time,
                    checkin_start_day: settings.checkin_start_day,
                    checkin_end_day: settings.checkin_end_day,
                    checkin_deadline_time: settings.checkin_deadline_time,
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
                // Backend response is already in GMT+7 (see teamHandler.js updateSettings) —
                // no conversion needed here (see NOTE above about the double-conversion bug).
                setSettings((prev) => ({ ...prev, auto_create_sessions: data.scheduling.auto_create_sessions, session_frequency: data.scheduling.session_frequency, session_days: data.scheduling.session_days, session_time: data.scheduling.session_time, session_type: data.scheduling.session_type, session_location: data.scheduling.session_location, auto_session_creation_time: data.scheduling.auto_session_creation_time, checkin_creation_day: data.scheduling.checkin_creation_day, checkin_creation_time: data.scheduling.checkin_creation_time, checkin_start_day: data.scheduling.checkin_start_day, checkin_end_day: data.scheduling.checkin_end_day, checkin_deadline_time: data.scheduling.checkin_deadline_time }))
            }

            toast('Cài đặt đã được lưu', 'success')
        } catch (e: any) {
            toast(e?.message || 'Lỗi lưu cài đặt', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', padding: 'max(12px, 4vw) max(8px, 3vw)', paddingTop: 'clamp(80px, 12vh, 88px)', color: G.t1, width: '100%', boxSizing: 'border-box', overflow: 'hidden', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 12px)', marginBottom: 'clamp(16px, 3vh, 20px)' }}>
                <button onClick={() => router.back()} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t1, borderRadius: '10px', padding: '6px 10px', cursor: 'pointer', fontSize: 'clamp(14px, 4vw, 16px)', flexShrink: 0 }}>‹</button>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '2px' }}>Cấu hình</p>
                    <h1 style={{ fontSize: 'clamp(18px, 5vw, 28px)', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Cài Đặt Đội</h1>
                </div>
            </div>

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: 'clamp(4px, 1vw, 6px)', marginBottom: 'clamp(16px, 3vh, 20px)', overflowX: 'auto', paddingBottom: '8px', scrollBehavior: 'smooth' }}>
                {[
                    { id: 'general', label: 'Thông tin', icon: <Gear size={14} /> },
                    { id: 'finance', label: 'Tài chính & Quỹ', icon: <CurrencyDollar size={14} /> },
                    { id: 'scheduling', label: 'Lịch', icon: <Calendar size={14} /> },
                    { id: 'invite', label: 'Mời', icon: <CalendarPlus size={14} /> },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as TabType)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: 'clamp(6px, 1.5vw, 8px) clamp(10px, 2vw, 12px)',
                            borderRadius: '20px',
                            fontSize: 'clamp(10px, 2.5vw, 12px)',
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
            <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
                {/* General Settings */}
                {tab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box', width: '100%' }}>
                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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

                {/* Finance Settings */}
                {tab === 'finance' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 3vh, 16px)', boxSizing: 'border-box', width: '100%' }}>
                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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

                        {/* Fund Section */}
                        <div style={{ paddingTop: '8px', borderTop: `1px solid ${G.glassBorder}`, marginTop: '4px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: G.t3, margin: '0 0 12px 0' }}>Thông tin tài khoản quỹ</p>
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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
                        </div>

                        <div style={{
                            background: G.glass,
                            border: `1px solid ${G.glassBorder}`,
                            borderRadius: '16px',
                            padding: '20px',
                            backdropFilter: 'blur(12px)', boxSizing: 'border-box',
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
                                    fontFamily: 'monospace',
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
                {tab === 'scheduling' && (() => {
                    const inputStyle: React.CSSProperties = {
                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${G.glassBorder}`,
                        color: G.t1, fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                        opacity: isOwner ? 1 : 0.6,
                    }
                    const labelStyle: React.CSSProperties = {
                        display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.09em', color: G.t3,
                    }
                    const DAY_OPTIONS = [
                        { value: 'mon', label: 'Thứ 2' }, { value: 'tue', label: 'Thứ 3' },
                        { value: 'wed', label: 'Thứ 4' }, { value: 'thu', label: 'Thứ 5' },
                        { value: 'fri', label: 'Thứ 6' }, { value: 'sat', label: 'Thứ 7' },
                        { value: 'sun', label: 'Chủ nhật' },
                    ]
                    const DAY_SHORT: any = { mon: 'T2', tue: 'T3', wed: 'T4', thu: 'T5', fri: 'T6', sat: 'T7', sun: 'CN' }
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>

                            {/* Toggle tự động */}
                            <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '16px 20px', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.t1 }}>Tự động tạo lịch sự kiện</p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: G.t3 }}>Hệ thống tự tạo sự kiện theo lịch định sẵn</p>
                                </div>
                                <input type="checkbox" checked={settings.auto_create_sessions}
                                    onChange={(e) => setSettings({ ...settings, auto_create_sessions: e.target.checked })}
                                    disabled={!isOwner}
                                    style={{ width: '20px', height: '20px', flexShrink: 0, cursor: isOwner ? 'pointer' : 'default', opacity: isOwner ? 1 : 0.6 }}
                                />
                            </div>

                            {settings.auto_create_sessions && (<>

                                {/* Card 1: Thông tin sự kiện */}
                                <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '20px', backdropFilter: 'blur(12px)', boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                                        <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: G.accent }} />
                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: G.t1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Thông tin sự kiện</p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div>
                                            <label style={labelStyle}>Loại sự kiện</label>
                                            <select value={settings.session_type || 'training'}
                                                onChange={(e) => setSettings({ ...settings, session_type: e.target.value as any })}
                                                disabled={!isOwner} style={inputStyle}>
                                                <option value="training">Tập luyện</option>
                                                <option value="match">Trận đấu</option>
                                                <option value="both">Cả hai</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Tần suất lặp lại</label>
                                            <select value={settings.session_frequency || 'disabled'}
                                                onChange={(e) => setSettings({ ...settings, session_frequency: e.target.value as any })}
                                                disabled={!isOwner} style={inputStyle}>
                                                <option value="disabled">Vô hiệu hóa</option>
                                                <option value="daily">Hàng ngày</option>
                                                <option value="weekly">Hàng tuần</option>
                                            </select>
                                        </div>

                                        {settings.session_frequency === 'weekly' && (
                                            <div>
                                                <label style={labelStyle}>Các ngày diễn ra trong tuần</label>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    {['mon','tue','wed','thu','fri','sat','sun'].map((day) => {
                                                        const selected = (settings.session_days || '').split(',').map(d => d.trim()).includes(day)
                                                        return (
                                                            <button key={day} disabled={!isOwner}
                                                                onClick={() => {
                                                                    const days = (settings.session_days || '').split(',').map(d => d.trim())
                                                                    setSettings({ ...settings, session_days: (selected ? days.filter(d => d !== day) : [...days, day]).filter(Boolean).join(',') })
                                                                }}
                                                                style={{ padding: '8px 14px', borderRadius: '10px', border: `2px solid ${selected ? G.accent : G.glassBorder}`, background: selected ? 'rgba(0,214,143,0.1)' : 'transparent', color: selected ? G.accent : G.t2, fontWeight: selected ? 700 : 500, cursor: isOwner ? 'pointer' : 'default', opacity: isOwner ? 1 : 0.6, fontSize: '13px' }}>
                                                                {DAY_SHORT[day]}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label style={labelStyle}>Giờ diễn ra (GMT+7)</label>
                                            <input type="time" value={settings.session_time || '18:00'}
                                                onChange={(e) => setSettings({ ...settings, session_time: e.target.value })}
                                                disabled={!isOwner} style={inputStyle} />
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Địa điểm (tùy chọn)</label>
                                            <input type="text" value={settings.session_location || ''}
                                                onChange={(e) => setSettings({ ...settings, session_location: e.target.value })}
                                                disabled={!isOwner} placeholder="VD: Sân Thống Nhất, 138 Đào Duy Từ..."
                                                style={inputStyle} />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Thông báo & thời hạn điểm danh */}
                                <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '20px', backdropFilter: 'blur(12px)', boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                        <div style={{ width: '3px', height: '16px', borderRadius: '2px', background: G.blue }} />
                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: G.t1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Thông báo & Thời hạn điểm danh</p>
                                    </div>
                                    <p style={{ fontSize: '12px', color: G.t3, margin: '0 0 20px 0' }}>
                                        Hệ thống gửi thông báo hỏi thành viên có tham gia không, và đóng lại khi hết hạn.
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={labelStyle}>Ngày gửi thông báo</label>
                                                <select value={settings.checkin_creation_day || 'mon'}
                                                    onChange={(e) => setSettings({ ...settings, checkin_creation_day: e.target.value })}
                                                    disabled={!isOwner} style={inputStyle}>
                                                    {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={labelStyle}>Giờ gửi thông báo (GMT+7)</label>
                                                <input type="time" value={settings.checkin_creation_time || '20:00'}
                                                    onChange={(e) => setSettings({ ...settings, checkin_creation_time: e.target.value })}
                                                    disabled={!isOwner} style={inputStyle} />
                                            </div>
                                        </div>

                                        <div style={{ height: '1px', background: G.glassBorder }} />

                                        <div>
                                            <label style={{ ...labelStyle, marginBottom: '10px' }}>Thời hạn điểm danh</label>
                                            <p style={{ fontSize: '12px', color: G.t3, margin: '0 0 10px 0' }}>
                                                Thành viên chỉ có thể xác nhận tham gia trong khoảng thời gian này.
                                            </p>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={labelStyle}>Từ ngày</label>
                                                    <select value={settings.checkin_start_day || 'fri'}
                                                        onChange={(e) => setSettings({ ...settings, checkin_start_day: e.target.value })}
                                                        disabled={!isOwner} style={inputStyle}>
                                                        {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={labelStyle}>Đến ngày</label>
                                                    <select value={settings.checkin_end_day || 'tue'}
                                                        onChange={(e) => setSettings({ ...settings, checkin_end_day: e.target.value })}
                                                        disabled={!isOwner} style={inputStyle}>
                                                        {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={labelStyle}>Giờ hết hạn (GMT+7)</label>
                                                    <input type="time" value={settings.checkin_deadline_time || settings.checkin_creation_time || '20:00'}
                                                        onChange={(e) => setSettings({ ...settings, checkin_deadline_time: e.target.value })}
                                                        disabled={!isOwner} style={inputStyle} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </>)}

                            {isOwner && (
                                <button onClick={handleSaveSettings} disabled={loading}
                                    style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: G.accent, color: '#070B14', fontWeight: 600, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                                    {loading ? 'Đang lưu...' : '✓ Lưu thay đổi'}
                                </button>
                            )}
                        </div>
                    )
                })()}

                {/* Invite Settings */}
                {tab === 'invite' && (
                    <div style={{
                        background: G.glass,
                        border: `1px solid ${G.glassBorder}`,
                        borderRadius: '16px',
                        padding: '20px',
                        backdropFilter: 'blur(12px)', boxSizing: 'border-box',
                    }}>
                        <p style={{ fontSize: '14px', color: G.t2, marginBottom: '16px' }}>
                            Chia sẻ link này với thành viên mới để họ tham gia đội
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: window.innerWidth < 480 ? 'column' : 'row',
                            alignItems: window.innerWidth < 480 ? 'stretch' : 'center',
                            gap: 'clamp(8px, 2vw, 12px)',
                            padding: 'clamp(8px, 2vw, 12px)',
                            borderRadius: '12px',
                            background: G.accentDim,
                            border: `1px solid rgba(0,214,143,0.25)`,
                            marginBottom: 'clamp(10px, 2vh, 12px)',
                        }}>
                            <input
                                type="text"
                                value={inviteCode ? `${window.location.origin}/onboarding/join?code=${inviteCode}` : ''}
                                readOnly
                                style={{
                                    flex: 1,
                                    minWidth: window.innerWidth < 480 ? '0' : '100px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: G.t1,
                                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                                    outline: 'none',
                                    wordBreak: 'break-all',
                                    padding: window.innerWidth < 480 ? '4px 0' : '0',
                                }}
                            />
                            <button
                                onClick={handleCopyInvite}
                                style={{
                                    padding: 'clamp(5px, 1.5vw, 6px) clamp(8px, 2vw, 10px)',
                                    borderRadius: '8px',
                                    background: G.accent,
                                    color: '#070B14',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: 'clamp(10px, 2vw, 11px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    justifyContent: 'center',
                                }}
                            >
                                {copied ? <CheckCircle size={window.innerWidth < 480 ? 10 : 12} /> : <Copy size={window.innerWidth < 480 ? 10 : 12} />}
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
                    marginTop: 'clamp(16px, 3vh, 20px)',
                    padding: 'clamp(10px, 2vw, 12px) clamp(12px, 2.5vw, 14px)',
                    background: 'rgba(255,165,0,0.1)',
                    border: '1px solid rgba(255,165,0,0.25)',
                    borderRadius: '12px',
                    color: '#FFA500',
                    fontSize: 'clamp(11px, 2.5vw, 12px)',
                    lineHeight: '1.4',
                }}
                >
                    ⚠️ Chỉ chủ đội mới có quyền thay đổi các cài đặt này
                </div>
            )}
        </div>
    )
}
