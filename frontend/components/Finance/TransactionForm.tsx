'use client'

import React, { useState } from 'react'

export interface TransactionFormData {
    description: string
    amount: number
    transaction_date?: string
    bill_image_url?: string
    category?: string
}

interface TransactionFormProps {
    onSubmit: (data: TransactionFormData) => void | Promise<void>
    isLoading?: boolean
    onCancel?: () => void
}

const G = {
    glass: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F',
    orange: '#F5A623',
    t1: '#F0F4FF',
    t2: 'rgba(240,244,255,0.55)',
    t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B',
}

const CATEGORIES = [
    { key: 'san', label: '🏟️ Thuê sân' },
    { key: 'trang_phuc', label: '👕 Trang phục' },
    { key: 'an_uong', label: '🍜 Ăn uống' },
    { key: 'dung_cu', label: '⚽ Dụng cụ' },
    { key: 'khac', label: '📦 Khác' },
]

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.09em',
    color: G.t3,
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, isLoading = false, onCancel }) => {
    const todayStr = new Date().toISOString().split('T')[0]

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        transaction_date: todayStr,
        bill_image_url: '',
        category: '',
    })
    const [errors, setErrors] = useState<{ description?: string; amount?: string }>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const busy = isSubmitting || isLoading

    const validate = (): boolean => {
        const errs: { description?: string; amount?: string } = {}
        if (!formData.description.trim()) errs.description = 'Vui lòng nhập mô tả'
        const amt = Number(formData.amount)
        if (!formData.amount || isNaN(amt) || amt <= 0) errs.amount = 'Số tiền phải lớn hơn 0'
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        try {
            setIsSubmitting(true)
            await onSubmit({
                description: formData.description.trim(),
                amount: Number(formData.amount),
                transaction_date: formData.transaction_date || undefined,
                bill_image_url: formData.bill_image_url || undefined,
                category: formData.category || undefined,
            })
            setFormData({ description: '', amount: '', transaction_date: todayStr, bill_image_url: '', category: '' })
        } catch (err) {
            console.error('TransactionForm submit error:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatVND = (raw: string) => {
        const num = Number(raw.replace(/\D/g, ''))
        return num ? num.toLocaleString('vi-VN') + ' ₫' : ''
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${G.glassBorder}`,
        color: G.t1,
        fontSize: '15px',
        outline: 'none',
        boxSizing: 'border-box',
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Số tiền — nổi bật nhất */}
            <div style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: '16px', padding: '16px' }}>
                <label style={{ ...labelStyle, color: G.orange }}>Số tiền chi <span style={{ color: G.red }}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: G.orange }}>₫</span>
                    <input
                        type="number"
                        min={1}
                        placeholder="0"
                        value={formData.amount}
                        onChange={(e) => { setFormData({ ...formData, amount: e.target.value }); if (errors.amount) setErrors({ ...errors, amount: undefined }) }}
                        style={{ ...inputStyle, border: 'none', background: 'transparent', fontSize: '28px', fontWeight: 700, color: G.t1, padding: '0', flex: 1 }}
                    />
                </div>
                {formData.amount && Number(formData.amount) > 0 && (
                    <p style={{ fontSize: '13px', color: G.orange, margin: '6px 0 0', opacity: 0.8 }}>
                        {formatVND(formData.amount)}
                    </p>
                )}
                {errors.amount && (
                    <p style={{ fontSize: '12px', color: G.red, margin: '4px 0 0' }}>{errors.amount}</p>
                )}
            </div>

            {/* Danh mục */}
            <div>
                <label style={labelStyle}>Danh mục</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {CATEGORIES.map(cat => (
                        <button key={cat.key} type="button"
                            onClick={() => setFormData({ ...formData, category: formData.category === cat.key ? '' : cat.key })}
                            style={{
                                padding: '7px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                background: formData.category === cat.key ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${formData.category === cat.key ? 'rgba(245,166,35,0.4)' : G.glassBorder}`,
                                color: formData.category === cat.key ? G.orange : G.t2,
                            }}>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mô tả */}
            <div>
                <label style={labelStyle}>Mô tả <span style={{ color: G.red }}>*</span></label>
                <input
                    type="text"
                    placeholder="VD: Tiền thuê sân tháng 6"
                    value={formData.description}
                    onChange={(e) => { setFormData({ ...formData, description: e.target.value }); if (errors.description) setErrors({ ...errors, description: undefined }) }}
                    style={{ ...inputStyle, borderColor: errors.description ? G.red : G.glassBorder }}
                />
                {errors.description && (
                    <p style={{ fontSize: '12px', color: G.red, margin: '4px 0 0 2px' }}>{errors.description}</p>
                )}
            </div>

            {/* Ngày chi */}
            <div>
                <label style={labelStyle}>Ngày chi</label>
                <input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    style={inputStyle}
                />
            </div>

            {/* Link hoá đơn */}
            <div>
                <label style={labelStyle}>
                    Ảnh hoá đơn{' '}
                    <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: G.t3 }}>(link, tuỳ chọn)</span>
                </label>
                <input
                    type="url"
                    placeholder="https://..."
                    value={formData.bill_image_url}
                    onChange={(e) => setFormData({ ...formData, bill_image_url: e.target.value })}
                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px' }}
                />
                {formData.bill_image_url && (
                    <img
                        src={formData.bill_image_url}
                        alt="Hoá đơn"
                        style={{ width: '100%', maxWidth: '200px', borderRadius: '10px', marginTop: '8px', border: `1px solid ${G.glassBorder}`, objectFit: 'cover' }}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                {onCancel && (
                    <button type="button" onClick={onCancel} disabled={busy}
                        style={{ flex: 1, padding: '13px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: 'transparent', color: G.t2, fontWeight: 600, fontSize: '14px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}>
                        Huỷ
                    </button>
                )}
                <button type="submit" disabled={busy}
                    style={{ flex: 2, padding: '13px', borderRadius: '12px', border: 'none', background: busy ? 'rgba(245,166,35,0.4)' : G.orange, color: '#070B14', fontWeight: 700, fontSize: '14px', cursor: busy ? 'default' : 'pointer', transition: 'all 0.2s' }}>
                    {busy ? 'Đang gửi...' : '📤 Gửi báo cáo chi'}
                </button>
            </div>
        </form>
    )
}
