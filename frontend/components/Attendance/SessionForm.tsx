'use client'

import React, { useState } from 'react'
import { COLORS, TYPOGRAPHY } from '@/lib/constants'

export interface SessionFormData {
    session_date: string
    session_type: 'training' | 'match'
    location?: string
    description?: string
    check_in_deadline?: string
}

interface SessionFormProps {
    onSubmit: (data: SessionFormData) => void
    isLoading?: boolean
    onCancel?: () => void
}

export const SessionForm: React.FC<SessionFormProps> = ({
    onSubmit,
    isLoading = false,
    onCancel,
}) => {
    const now = new Date()
    const localDateStr = now.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"

    const [formData, setFormData] = useState<SessionFormData>({
        session_date: localDateStr,
        session_type: 'training',
        location: '',
        description: '',
        check_in_deadline: '',
    })

    const [errors, setErrors] = useState<Partial<Record<keyof SessionFormData, string>>>({})

    const validate = (): boolean => {
        const errs: Partial<Record<keyof SessionFormData, string>> = {}

        if (!formData.session_date) {
            errs.session_date = 'Ngày buổi tập là bắt buộc'
        }

        if (formData.check_in_deadline) {
            const deadline = new Date(formData.check_in_deadline)
            const sessionDate = new Date(formData.session_date)
            if (isNaN(deadline.getTime())) {
                errs.check_in_deadline = 'Định dạng thời gian không hợp lệ'
            } else if (deadline <= sessionDate) {
                errs.check_in_deadline = 'Hạn chót phải sau thời gian buổi tập'
            }
        }

        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return

        const payload: SessionFormData = {
            session_date: new Date(formData.session_date).toISOString(),
            session_type: formData.session_type,
            location: formData.location || undefined,
            description: formData.description || undefined,
            check_in_deadline: formData.check_in_deadline
                ? new Date(formData.check_in_deadline).toISOString()
                : undefined,
        }
        onSubmit(payload)
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 12px',
        border: `1px solid ${COLORS.lightGray}`,
        borderRadius: '8px',
        fontSize: TYPOGRAPHY.sizes.body,
        color: COLORS.black,
        backgroundColor: COLORS.white,
        boxSizing: 'border-box',
    }

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: TYPOGRAPHY.sizes.caption,
        fontWeight: TYPOGRAPHY.weights.medium,
        color: '#4A4540',
        marginBottom: '6px',
    }

    const fieldStyle: React.CSSProperties = { marginBottom: '16px' }

    const errorStyle: React.CSSProperties = {
        fontSize: TYPOGRAPHY.sizes.caption,
        color: '#E53E3E',
        marginTop: '4px',
    }

    return (
        <form onSubmit={handleSubmit} style={{ padding: '4px 0' }}>
            {/* Session Date */}
            <div style={fieldStyle}>
                <label style={labelStyle}>
                    Thời gian buổi tập <span style={{ color: '#E53E3E' }}>*</span>
                </label>
                <input
                    type="datetime-local"
                    style={inputStyle}
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                />
                {errors.session_date && <p style={errorStyle}>{errors.session_date}</p>}
            </div>

            {/* Session Type */}
            <div style={fieldStyle}>
                <label style={labelStyle}>Loại buổi tập</label>
                <select
                    style={inputStyle}
                    value={formData.session_type}
                    onChange={(e) =>
                        setFormData({ ...formData, session_type: e.target.value as 'training' | 'match' })
                    }
                >
                    <option value="training">Tập luyện</option>
                    <option value="match">Thi đấu</option>
                </select>
            </div>

            {/* Check-in Deadline */}
            <div style={fieldStyle}>
                <label style={labelStyle}>Hạn chót điểm danh</label>
                <input
                    type="datetime-local"
                    style={inputStyle}
                    value={formData.check_in_deadline}
                    onChange={(e) => setFormData({ ...formData, check_in_deadline: e.target.value })}
                />
                {errors.check_in_deadline && <p style={errorStyle}>{errors.check_in_deadline}</p>}
                <p style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.gray, marginTop: '4px' }}>
                    Để trống nếu không giới hạn thời gian điểm danh
                </p>
            </div>

            {/* Location */}
            <div style={fieldStyle}>
                <label style={labelStyle}>Địa điểm</label>
                <input
                    type="text"
                    style={inputStyle}
                    placeholder="VD: Sân bóng Thống Nhất"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
            </div>

            {/* Description */}
            <div style={fieldStyle}>
                <label style={labelStyle}>Ghi chú</label>
                <textarea
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    placeholder="Thông tin thêm về buổi tập..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '12px',
                            border: `1px solid ${COLORS.lightGray}`,
                            borderRadius: '8px',
                            background: COLORS.white,
                            fontSize: TYPOGRAPHY.sizes.body,
                            cursor: 'pointer',
                            color: '#4A4540',
                        }}
                    >
                        Huỷ
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        flex: 2,
                        padding: '12px',
                        border: 'none',
                        borderRadius: '8px',
                        background: isLoading ? COLORS.lightGray : COLORS.black,
                        color: COLORS.white,
                        fontSize: TYPOGRAPHY.sizes.body,
                        fontWeight: TYPOGRAPHY.weights.semibold,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isLoading ? 'Đang tạo...' : 'Tạo lịch điểm danh'}
                </button>
            </div>
        </form>
    )
}
