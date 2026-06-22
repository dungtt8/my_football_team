'use client'

import React, { useState } from 'react'
import { Button } from '@/components/Common/Button'

interface FormData {
  description: string
  amount: string
  category: string
  receipt?: File
  notes: string
}

interface FormErrors {
  description?: string
  amount?: string
  category?: string
}

interface TransactionFormProps {
  onSubmit: (data: FormData) => void | Promise<void>
  isLoading?: boolean
  onCancel?: () => void
}

const CATEGORIES = ['Food', 'Equipment', 'Travel', 'Other']

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FormData>({
    description: '',
    amount: '',
    category: '',
    receipt: undefined,
    notes: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.trim().length < 3) {
      newErrors.description = 'Description must be at least 3 characters'
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required'
    } else if (Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFormData((prev) => ({
      ...prev,
      receipt: file,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(formData)
      setFormData({
        description: '',
        amount: '',
        category: '',
        receipt: undefined,
        notes: '',
      })
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSubmittingForm = isSubmitting || isLoading

  return (
    <form onSubmit={handleSubmit} className="space-y-lg p-xl border border-light-gray rounded-card bg-white max-w-md mx-auto">
      <div>
        <label className="block text-caption text-gray mb-md font-medium">
          Expense Description
        </label>
        <input
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Team lunch meeting"
          className="w-full px-md py-lg border border-light-gray rounded-card text-body focus:outline-none focus:border-black focus:bg-white transition-colors"
        />
        {errors.description && (
          <p className="text-caption text-pale-red mt-sm">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-caption text-gray mb-md font-medium">
          Amount (VND)
        </label>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0"
          className="w-full px-md py-lg border border-light-gray rounded-card text-body focus:outline-none focus:border-black focus:bg-white transition-colors"
        />
        {errors.amount && (
          <p className="text-caption text-pale-red mt-sm">{errors.amount}</p>
        )}
      </div>

      <div>
        <label className="block text-caption text-gray mb-md font-medium">
          Category
        </label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="w-full px-md py-lg border border-light-gray rounded-card text-body focus:outline-none focus:border-black focus:bg-white transition-colors"
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-caption text-pale-red mt-sm">{errors.category}</p>
        )}
      </div>

      <div>
        <label className="block text-caption text-gray mb-md font-medium">
          Receipt Image (Optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full px-md py-lg border border-light-gray rounded-card text-small focus:outline-none focus:border-black transition-colors"
        />
      </div>

      <div>
        <label className="block text-caption text-gray mb-md font-medium">
          Notes (Optional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Additional details..."
          rows={4}
          className="w-full px-md py-lg border border-light-gray rounded-card text-body focus:outline-none focus:border-black focus:bg-white transition-colors resize-none"
        />
      </div>

      <div className="flex gap-md pt-lg">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmittingForm}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmittingForm}
          className="flex-1"
        >
          Submit Expense
        </Button>
      </div>
    </form>
  )
}
