'use client'

import React, { useState } from 'react'
import { Button } from '@/components/Common/Button'

export interface TransactionFormData {
    description: string
    amount: number
    transaction_date?: string
    bill_image_url?: string
}

interface FormErrors {
    description?: string
    amount?: string
}

interface TransactionFormProps {
    onSubmit: (data: TransactionFormData) => void | Promise<void>
    isLoading?: boolean
    onCancel?: () => void
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
    onSubmit,
    isLoading = false,
    onCancel,
}) => {
    const todayStr = new Date().toISOString().split('T')[0]

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        transaction_date: todayStr,
        bill_image_url: '',
    })
    const [errors, setErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const validate = (): boolean => {
        const errs: FormErrors = {}
        if (!formData.description.trim()) {
            errs.description = 'Mô tả là bắt buộc'
        }
        const amt = Number(formData.amount)
        if (!formData.amount || isNaN(amt) || amt <= 0) {
            errs.amount = 'Số tiền phải lớn hơn 0'
        }
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
            })
            setFormData({ description: '', amount: '', transaction_date: todayStr, bill_image_url: '' })
        } catch (err) {
            console.error('TransactionForm submit error:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors bg-white'
    const labelCls = 'block text-xs font-semibold uppercase tracking-wide mb-1.5'
    const busy = isSubmitting || isLoading

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Description */}
            <div>
                <label className={labelCls} style={{ color: '#6B6660' }}>Mô tả khoản chi *</label>
                <input
                    type="text"
                    className={inputCls}
                    placeholder="VD: Tiền thuê sân tháng 6"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                {errors.description && <p className="text-xs mt-1" style={{ color: '#E53E3E' }}>{errors.description}</p>}
            </div>

            {/* Amount */}
            <div>
                <label className={labelCls} style={{ color: '#6B6660' }}>Số tiền (VND) *</label>
                <input
                    type="number"
                    min={1}
                    className={inputCls}
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
                {errors.amount && <p className="text-xs mt-1" style={{ color: '#E53E3E' }}>{errors.amount}</p>}
            </div>

            {/* Date */}
            <div>
                <label className={labelCls} style={{ color: '#6B6660' }}>Ngày chi</label>
                <input
                    type="date"
                    className={inputCls}
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                />
            </div>

            {/* Bill image URL */}
            <div>
                <label className={labelCls} style={{ color: '#6B6660' }}>Link ảnh hoá đơn (tuỳ chọn)</label>
                <input
                    type="url"
                    className={inputCls}
                    placeholder="https://..."
                    value={formData.bill_image_url}
                    onChange={(e) => setFormData({ ...formData, bill_image_url: e.target.value })}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                {onCancel && (
                    <Button type="button" variant="secondary" onClick={onCancel} disabled={busy} className="flex-1">
                        Huỷ
                    </Button>
                )}
                <Button type="submit" variant="primary" isLoading={busy} className="flex-1">
                    Gửi báo cáo
                </Button>
            </div>
        </form>
    )
}

