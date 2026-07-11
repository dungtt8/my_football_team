'use client'

import React, { useState } from 'react'

interface CampaignFormData {
    name: string
    amount_per_member: number
    deadline?: string
    description?: string
}

interface CampaignFormProps {
    onSubmit: (data: CampaignFormData) => void | Promise<void>
    isLoading?: boolean
    onCancel?: () => void
}

interface FormErrors {
    name?: string
    amount_per_member?: string
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
    onSubmit,
    isLoading = false,
    onCancel,
}) => {
    const [formData, setFormData] = useState({
        name: '',
        amount_per_member: '',
        deadline: '',
        description: '',
    })
    const [errors, setErrors] = useState<FormErrors>({})

    const validate = (): boolean => {
        const e: FormErrors = {}
        if (!formData.name.trim()) e.name = 'Tên khoản thu không được để trống'
        const amt = parseFloat(formData.amount_per_member)
        if (isNaN(amt) || amt <= 0) e.amount_per_member = 'Số tiền phải lớn hơn 0'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
        if (errors[name as keyof FormErrors]) setErrors((prev) => ({ ...prev, [name]: undefined }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        onSubmit({
            name: formData.name.trim(),
            amount_per_member: parseFloat(formData.amount_per_member),
            deadline: formData.deadline || undefined,
            description: formData.description.trim() || undefined,
        })
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 14px',
        border: '1.5px solid var(--line)',
        borderRadius: 'var(--r)',
        fontSize: 14,
        background: 'var(--surface-2)',
        color: 'var(--ink)',
        outline: 'none',
        transition: 'border-color .15s ease, box-shadow .15s ease',
    }
    const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }
    const focusRing = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = 'var(--brand-600)'
        e.target.style.boxShadow = '0 0 0 3px var(--brand-050)'
    }
    const blurRing = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        e.target.style.borderColor = 'var(--line)'
        e.target.style.boxShadow = 'none'
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Name */}
            <div>
                <label style={labelStyle}>
                    Tên khoản thu <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onFocus={focusRing}
                    onBlur={blurRing}
                    placeholder="VD: Quỹ giải đấu tháng 7"
                    style={{ ...inputStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--line)' }}
                />
                {errors.name && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{errors.name}</p>}
            </div>

            {/* Amount per member */}
            <div>
                <label style={labelStyle}>
                    Số tiền / thành viên <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 14, fontWeight: 600, pointerEvents: 'none' }}>₫</span>
                    <input
                        type="number"
                        name="amount_per_member"
                        value={formData.amount_per_member}
                        onChange={handleChange}
                        onFocus={focusRing}
                        onBlur={blurRing}
                        placeholder="100.000"
                        min="0"
                        style={{ ...inputStyle, paddingLeft: 30, borderColor: errors.amount_per_member ? 'var(--danger)' : 'var(--line)' }}
                    />
                </div>
                {errors.amount_per_member && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{errors.amount_per_member}</p>}
            </div>

            {/* Deadline */}
            <div>
                <label style={labelStyle}>Hạn chót (tuỳ chọn)</label>
                <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    onFocus={focusRing}
                    onBlur={blurRing}
                    style={inputStyle}
                />
            </div>

            {/* Description */}
            <div>
                <label style={labelStyle}>Mô tả (tuỳ chọn)</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    onFocus={focusRing}
                    onBlur={blurRing}
                    placeholder="Thông tin thêm về khoản thu..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'none' }}
                />
            </div>

            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn btn-ghost"
                        style={{ flex: 1, padding: '13px 0', fontWeight: 600 }}
                    >
                        Huỷ
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '13px 0', fontWeight: 700, opacity: isLoading ? 0.6 : 1 }}
                >
                    {isLoading ? 'Đang tạo...' : 'Tạo chiến dịch'}
                </button>
            </div>
        </form>
    )
}
