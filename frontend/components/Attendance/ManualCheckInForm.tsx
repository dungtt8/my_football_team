'use client'

import React, { useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'

interface ManualCheckInFormProps {
  onSubmit: (data: {
    date: string
    checkInTime: string
    checkOutTime?: string
    reason: string
    notes?: string
  }) => void
  isLoading?: boolean
  onCancel?: () => void
}

export const ManualCheckInForm: React.FC<ManualCheckInFormProps> = ({
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState({
    date: today,
    checkInTime: '09:00',
    checkOutTime: '17:00',
    reason: '',
    notes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.date) {
      newErrors.date = 'Ngày là bắt buộc'
    } else {
      const selectedDate = new Date(formData.date)
      if (selectedDate > new Date()) {
        newErrors.date = 'Không thể chọn ngày trong tương lai'
      }
    }

    if (!formData.checkInTime) {
      newErrors.checkInTime = 'Thời gian điểm danh là bắt buộc'
    }

    if (!formData.reason) {
      newErrors.reason = 'Lý do là bắt buộc'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const FormField = ({
    label,
    name,
    type = 'text',
    required = false,
    value,
    onChange,
    error,
    children,
  }: {
    label: string
    name: string
    type?: string
    required?: boolean
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    error?: string
    children?: React.ReactNode
  }) => (
    <div style={{ marginBottom: '16px' }}>
      <label
        style={{
          display: 'block',
          fontSize: TYPOGRAPHY.sizes.caption,
          color: COLORS.gray,
          marginBottom: '6px',
          fontWeight: TYPOGRAPHY.weights.medium,
        }}
      >
        {label}
        {required && <span style={{ color: '#F44336' }}>*</span>}
      </label>
      {children || (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${error ? '#F44336' : COLORS.lightGray}`,
            borderRadius: '8px',
            fontSize: TYPOGRAPHY.sizes.small,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      )}
      {error && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontSize: TYPOGRAPHY.sizes.caption,
            color: '#F44336',
          }}
        >
          {error}
        </p>
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          border: `1px solid ${COLORS.lightGray}`,
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: COLORS.white,
        }}
      >
        <h2
          style={{
            margin: '0 0 20px 0',
            fontSize: TYPOGRAPHY.sizes.sectionTitle,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Điểm danh thủ công
        </h2>

        {/* Date Field */}
        <FormField
          label="Ngày điểm danh"
          name="date"
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          error={errors.date}
        />

        {/* Check-In Time Field */}
        <FormField
          label="Giờ điểm danh"
          name="checkInTime"
          type="time"
          required
          value={formData.checkInTime}
          onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
          error={errors.checkInTime}
        />

        {/* Check-Out Time Field */}
        <FormField
          label="Giờ kết thúc"
          name="checkOutTime"
          type="time"
          value={formData.checkOutTime}
          onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
        />

        {/* Reason Field */}
        <FormField
          label="Lý do nhập thủ công"
          name="reason"
          required
          error={errors.reason}
        >
          <select
            value={formData.reason}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, reason: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${errors.reason ? '#F44336' : COLORS.lightGray}`,
              borderRadius: '8px',
              fontSize: TYPOGRAPHY.sizes.small,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              backgroundColor: COLORS.white,
              cursor: 'pointer',
            }}
          >
            <option value="">Chọn lý do</option>
            <option value="late">Đi muộn</option>
            <option value="makeup">Bù buổi</option>
            <option value="special_permission">Phép đặc biệt</option>
          </select>
        </FormField>

        {/* Notes Field */}
        <FormField
          label="Ghi chú thêm"
          name="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        >
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ghi chú tùy chọn..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${COLORS.lightGray}`,
              borderRadius: '8px',
              fontSize: TYPOGRAPHY.sizes.small,
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              minHeight: '80px',
              resize: 'vertical',
            }}
          />
        </FormField>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: SPACING.md, marginTop: '24px' }}>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: COLORS.black,
              color: COLORS.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: TYPOGRAPHY.sizes.small,
              fontWeight: TYPOGRAPHY.weights.medium,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Đang gửi...' : 'Gửi để duyệt'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: COLORS.bone,
                color: COLORS.black,
                border: `1px solid ${COLORS.lightGray}`,
                borderRadius: '8px',
                fontSize: TYPOGRAPHY.sizes.small,
                fontWeight: TYPOGRAPHY.weights.medium,
                cursor: 'pointer',
              }}
            >
              Huỷ
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
