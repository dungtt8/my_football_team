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
        if (!formData.name.trim()) e.name = 'Tên chiến dịch không được để trống'
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

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4A4540' }}>
                    Tên chiến dịch <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="VD: Quỹ giải đấu tháng 7"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Amount per member */}
            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4A4540' }}>
                    Số tiền / thành viên (₫) <span className="text-red-500">*</span>
                </label>
                <input
                    type="number"
                    name="amount_per_member"
                    value={formData.amount_per_member}
                    onChange={handleChange}
                    placeholder="100000"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                />
                {errors.amount_per_member && <p className="text-xs text-red-500 mt-1">{errors.amount_per_member}</p>}
            </div>

            {/* Deadline */}
            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4A4540' }}>
                    Hạn chót (tuỳ chọn)
                </label>
                <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#4A4540' }}>
                    Mô tả (tuỳ chọn)
                </label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Thông tin thêm về chiến dịch..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black resize-none"
                />
            </div>

            <div className="flex gap-3 pt-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl text-sm font-medium border"
                        style={{ borderColor: '#E5E5E5', color: '#6B6660' }}
                    >
                        Huỷ
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ background: '#0F0E0C', color: '#FFFCF9' }}
                >
                    {isLoading ? 'Đang tạo...' : 'Tạo chiến dịch'}
                </button>
            </div>
        </form>
    )
}
