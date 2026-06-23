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

type TabType = 'general' | 'attendance' | 'finance' | 'scheduling' | 'invite'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface TeamSettings {
    team_name?: string
    team_description?: string
    attendance_enabled?: boolean
    attendance_schedule?: string // JSON: { day: number (0-6), time: string }[]
    attendance_cooldown?: number // minutes before can check in
    fund_closing_day?: number // day of month
    fund_closing_time?: string // HH:mm
    fund_closing_from_date?: string // YYYY-MM-DD
    fund_closing_to_date?: string // YYYY-MM-DD
    max_members?: number
    auto_create_sessions?: boolean
    session_frequency?: 'disabled' | 'daily' | 'weekly' | 'custom'
    session_days?: string // 'mon,wed,fri'
    session_time?: string // HH:mm
    session_type?: 'training' | 'match' | 'both'
    session_location?: string
}

export default function TeamSettingsPage() {
    const router = useRouter()
    const { user, role, team } = useAuth()
    const { toast } = useToast()
    const isOwner = role === 'owner'

    const [tab, setTab] = useState<TabType>('general')
    const [loading, setLoading] = useState(false)
    const [inviteCode, setInviteCode] = useState<string>('')
    const [copied, setCopied] = useState(false)

    const [settings, setSettings] = useState<TeamSettings>({
        team_name: team?.name || '',
        attendance_enabled: true,
        fund_closing_day: 1,
        fund_closing_time: '23:59',
        fund_closing_from_date: '',
        fund_closing_to_date: '',
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
                    fund_closing_from_date: data.finance?.closing_from_date || '',
                    fund_closing_to_date: data.finance?.closing_to_date || '',
                    auto_create_sessions: data.scheduling?.auto_create_sessions || false,
                    session_frequency: data.scheduling?.session_frequency || 'disabled',
                    session_days: data.scheduling?.session_days || '',
                    session_time: data.scheduling?.session_time || '18:00',
                    session_type: data.scheduling?.session_type || 'training',
                    session_location: data.scheduling?.session_location || '',
                })
                setInviteCode(data.invite?.code || '')
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
        }
    }

    const handleCopyInvite = () => {
        if (!inviteCode) return
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
                    closing_from_date: settings.fund_closing_from_date || null,
                    closing_to_date: settings.fund_closing_to_date || null,
                }
            } else if (tab === 'scheduling') {
                payload.scheduling = {
                    auto_create_sessions: settings.auto_create_sessions,
                    session_frequency: settings.session_frequency,
                    session_days: settings.session_days,
                    session_time: settings.session_time,
                    session_type: settings.session_type,
                    session_location: settings.session_location,
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
                setSettings((prev) => ({ ...prev, fund_closing_day: data.finance.closing_day, fund_closing_time: data.finance.closing_time, fund_closing_from_date: data.finance.closing_from_date || '', fund_closing_to_date: data.finance.closing_to_date || '' }))
            }
            if (data.scheduling) {
                setSettings((prev) => ({ ...prev, auto_create_sessions: data.scheduling.auto_create_sessions, session_frequency: data.scheduling.session_frequency, session_days: data.scheduling.session_days, session_time: data.scheduling.session_time, session_type: data.scheduling.session_type, session_location: data.scheduling.session_location }))
            }

            toast('Cài đặt đã được lưu', 'success')
        } catch (e: any) {
            toast(e?.message || 'Lỗi lưu cài đặt', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px', paddingTop: '88px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                <button onClick={() => router.back()} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t1, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '4px' }}>Cấu hình</p>
                    <h1 style={{ fontSize: '28px', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Cài Đặt Đội</h1>
                </div>
            </div>

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '8px' }}>
                {[
                    { id: 'general', label: 'Thông tin', icon: <Gear size={16} /> },
                    { id: 'attendance', label: 'Điểm danh', icon: <Clock size={16} /> },
                    { id: 'finance', label: 'Tài chính', icon: <CurrencyDollar size={16} /> },
                    { id: 'scheduling', label: 'Lịch trình', icon: <Calendar size={16} /> },
                    { id: 'invite', label: 'Mời thành viên', icon: <CalendarPlus size={16} /> },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id as TabType)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: tab === t.id ? 600 : 500,
                            border: 'none',
                            cursor: 'pointer',
                            background: tab === t.id ? G.accent : G.glass,
                            color: tab === t.id ? '#070B14' : G.t2,
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
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
                                Kỳ đóng quỹ: Từ ngày
                            </label>
                            <input
                                type="date"
                                value={settings.fund_closing_from_date || ''}
                                onChange={(e) => setSettings({ ...settings, fund_closing_from_date: e.target.value })}
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
                                Thành viên sẽ nhận thông báo vào ngày đầu tiên
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
                                Kỳ đóng quỹ: Đến ngày
                            </label>
                            <input
                                type="date"
                                value={settings.fund_closing_to_date || ''}
                                onChange={(e) => setSettings({ ...settings, fund_closing_to_date: e.target.value })}
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
                                ℹ️ Để trống để vô hiệu hóa kỳ đóng quỹ
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
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: G.accentDim,
                            border: `1px solid rgba(0,214,143,0.25)`,
                            marginBottom: '12px',
                        }}>
                            <input
                                type="text"
                                value={inviteCode ? `${window.location.origin}/onboarding/join?code=${inviteCode}` : ''}
                                readOnly
                                style={{
                                    flex: 1,
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
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    background: G.accent,
                                    color: '#070B14',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                {copied ? 'Đã copy' : 'Copy'}
                            </button>
                        </div>

                        {isOwner && (
                            <button
                                onClick={loadSettings}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    background: G.glass,
                                    border: `1px solid ${G.glassBorder}`,
                                    color: G.t2,
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500,
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
                                🔄 Tạo mã mời mới
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Info box */}
            {!isOwner && (
                <div style={{
                    marginTop: '32px',
                    padding: '16px',
                    background: 'rgba(255,165,0,0.1)',
                    border: '1px solid rgba(255,165,0,0.25)',
                    borderRadius: '12px',
                    color: '#FFA500',
                    fontSize: '13px',
                }}
                >
                    ⚠️ Chỉ chủ đội mới có quyền thay đổi các cài đặt này
                </div>
            )}
        </div>
    )
}
