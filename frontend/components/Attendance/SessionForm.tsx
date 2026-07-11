'use client'

import React, { useState } from 'react'

export interface SessionFormData {
    session_date: string
    session_type: 'training' | 'match'
    location?: string
    description?: string
    check_in_deadline: string
}

interface SessionFormProps {
    onSubmit: (data: SessionFormData) => void
    isLoading?: boolean
    onCancel?: () => void
    initialData?: Partial<SessionFormData>
    submitLabel?: string
    loadingLabel?: string
}

const G = {
    glassBorder: '#E7ECF3',
    accent: '#12B76A',
    t1: '#0B1220',
    t2: 'rgba(11,18,32,0.55)',
    t3: 'rgba(11,18,32,0.30)',
    red: '#F04438',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#F8FAFC',
    border: `1px solid ${G.glassBorder}`,
    color: G.t1,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: G.t3,
}

export const SessionForm: React.FC<SessionFormProps> = ({ onSubmit, isLoading = false, onCancel, initialData, submitLabel, loadingLabel }) => {
    const toLocalDatetime = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    const now = new Date()
    // Default session: today 18:00, deadline: today 17:00
    const defaultSession = new Date(now); defaultSession.setHours(18, 0, 0, 0)
    const defaultDeadline = new Date(now); defaultDeadline.setHours(17, 0, 0, 0)

    const [formData, setFormData] = useState<SessionFormData>({
        session_date: initialData?.session_date ? toLocalDatetime(new Date(initialData.session_date)) : toLocalDatetime(defaultSession),
        session_type: initialData?.session_type || 'training',
        location: initialData?.location || '',
        description: initialData?.description || '',
        check_in_deadline: initialData?.check_in_deadline ? toLocalDatetime(new Date(initialData.check_in_deadline)) : toLocalDatetime(defaultDeadline),
    })
    const [errors, setErrors] = useState<Partial<Record<keyof SessionFormData, string>>>({})

    const validate = (): boolean => {
        const errs: Partial<Record<keyof SessionFormData, string>> = {}
        if (!formData.session_date) errs.session_date = 'Bắt buộc'
        if (!formData.check_in_deadline) {
            errs.check_in_deadline = 'Bắt buộc'
        } else if (new Date(formData.check_in_deadline) >= new Date(formData.session_date)) {
            errs.check_in_deadline = 'Hạn chót phải trước giờ diễn ra'
        }
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit({
            session_date: new Date(formData.session_date).toISOString(),
            session_type: formData.session_type,
            location: formData.location || undefined,
            description: formData.description || undefined,
            check_in_deadline: new Date(formData.check_in_deadline).toISOString(),
        })
    }

    const sessionDateObj = formData.session_date ? new Date(formData.session_date) : null
    const deadlineDateObj = formData.check_in_deadline ? new Date(formData.check_in_deadline) : null
    const minutesBefore = sessionDateObj && deadlineDateObj
        ? Math.round((sessionDateObj.getTime() - deadlineDateObj.getTime()) / 60000)
        : null

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Loại sự kiện */}
            <div>
                <label style={labelStyle}>Loại sự kiện</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(['training', 'match'] as const).map((type) => {
                        const selected = formData.session_type === type
                        return (
                            <button key={type} type="button"
                                onClick={() => setFormData({ ...formData, session_type: type })}
                                style={{
                                    flex: 1, padding: '11px', borderRadius: '12px', cursor: 'pointer',
                                    border: `2px solid ${selected ? G.accent : G.glassBorder}`,
                                    background: selected ? 'rgba(18,183,106,0.10)' : 'transparent',
                                    color: selected ? G.accent : G.t2,
                                    fontWeight: selected ? 700 : 500, fontSize: '14px',
                                    transition: 'all 0.15s',
                                }}>
                                {type === 'training' ? '🏃 Tập luyện' : '⚽ Thi đấu'}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Thời gian & Hạn chót — 2 cột */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Giờ diễn ra <span style={{ color: G.red }}>*</span></label>
                    <input type="datetime-local" value={formData.session_date}
                        onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                        style={{ ...inputStyle, borderColor: errors.session_date ? G.red : G.glassBorder }} />
                    {errors.session_date && <p style={{ fontSize: '11px', color: G.red, margin: '3px 0 0 2px' }}>{errors.session_date}</p>}
                </div>
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Hạn chót điểm danh <span style={{ color: G.red }}>*</span></label>
                    <input type="datetime-local" value={formData.check_in_deadline}
                        onChange={(e) => setFormData({ ...formData, check_in_deadline: e.target.value })}
                        style={{ ...inputStyle, borderColor: errors.check_in_deadline ? G.red : G.glassBorder }} />
                    {errors.check_in_deadline
                        ? <p style={{ fontSize: '11px', color: G.red, margin: '3px 0 0 2px' }}>{errors.check_in_deadline}</p>
                        : minutesBefore !== null && minutesBefore > 0 &&
                            <p style={{ fontSize: '11px', color: G.accent, margin: '3px 0 0 2px' }}>
                                Trước {minutesBefore >= 60 ? `${Math.round(minutesBefore / 60)} tiếng` : `${minutesBefore} phút`}
                            </p>
                    }
                </div>
            </div>

            {/* Địa điểm */}
            <div>
                <label style={labelStyle}>Địa điểm</label>
                <input type="text" placeholder="VD: Sân Thống Nhất, 138 Đào Duy Từ..."
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    style={inputStyle} />
            </div>

            {/* Ghi chú */}
            <div>
                <label style={labelStyle}>Ghi chú <span style={{ color: G.t3, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(tuỳ chọn)</span></label>
                <textarea placeholder="Thông tin thêm về buổi tập..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    style={{ ...inputStyle, resize: 'none' }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                {onCancel && (
                    <button type="button" onClick={onCancel} disabled={isLoading}
                        style={{ flex: 1, padding: '13px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: 'transparent', color: G.t2, fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: isLoading ? 0.5 : 1 }}>
                        Huỷ
                    </button>
                )}
                <button type="submit" disabled={isLoading}
                    style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: isLoading ? 'rgba(18,183,106,0.4)' : G.accent, color: '#FFFFFF', fontWeight: 700, fontSize: '14px', cursor: isLoading ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                    {isLoading ? (loadingLabel || 'Đang tạo...') : (submitLabel || '✓ Tạo lịch điểm danh')}
                </button>
            </div>
        </form>
    )
}
