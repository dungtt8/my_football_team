'use client'

import React, { useState } from 'react'
import { Button } from '@/components/Common/Button'
import { Campaign } from '@/hooks/useCampaign'

interface CampaignFormProps {
  onSubmit: (data: any) => void
  initialData?: Campaign
  isLoading?: boolean
  onCancel?: () => void
}

interface FormErrors {
  [key: string]: string
}

export const CampaignForm: React.FC<CampaignFormProps> = ({
  onSubmit,
  initialData,
  isLoading = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startDate: initialData?.startDate?.split('T')[0] || '',
    endDate: initialData?.endDate?.split('T')[0] || '',
    type: initialData?.type || 'Promotion',
    targetAudience: initialData?.targetAudience || 'All',
    notes: initialData?.notes || '',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.title || formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters'
    }

    if (!formData.description || formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    } else {
      const startDate = new Date(formData.startDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (startDate < today) {
        newErrors.startDate = 'Start date cannot be before today'
      }
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    } else if (formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date cannot be before start date'
    }

    if (!formData.type) {
      newErrors.type = 'Campaign type is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-lg p-xl bg-white border border-light-gray rounded-lg">
      {/* Title */}
      <div>
        <label className="block text-caption text-gray mb-md font-medium">Campaign Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter campaign title"
          className="w-full px-md py-md border border-light-gray rounded-lg focus:outline-none focus:border-black focus:bg-bone transition-colors"
        />
        {errors.title && <p className="text-caption text-red-600 mt-xs">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-caption text-gray mb-md font-medium">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter campaign description"
          rows={4}
          className="w-full px-md py-md border border-light-gray rounded-lg focus:outline-none focus:border-black focus:bg-bone transition-colors resize-none"
        />
        {errors.description && (
          <p className="text-caption text-red-600 mt-xs">{errors.description}</p>
        )}
      </div>

      {/* Dates Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Start Date */}
        <div>
          <label className="block text-caption text-gray mb-md font-medium">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="w-full px-md py-md border border-light-gray rounded-lg focus:outline-none focus:border-black focus:bg-bone transition-colors"
          />
          {errors.startDate && <p className="text-caption text-red-600 mt-xs">{errors.startDate}</p>}
        </div>

        {/* End Date */}
        <div>
          <label className="block text-caption text-gray mb-md font-medium">End Date</label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full px-md py-md border border-light-gray rounded-lg focus:outline-none focus:border-black focus:bg-bone transition-colors"
          />
          {errors.endDate && <p className="text-caption text-red-600 mt-xs">{errors.endDate}</p>}
        </div>
      </div>

      {/* Type and Audience Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Type */}
        <div>
          <label className="block text-caption text-gray mb-md font-medium">Campaign Type</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-md py-md border border-light-gray rounded-lg focus:outline-none focus:border-black focus:bg-bone transition-colors"
          >
            <option value="Promotion">Promotion</option>
            <option value="Event">Event</option>
            <option value="Survey">Survey</option>
            <option value="Announcement">Announcement</option>
          </select>
          {errors.type && <p className="text-caption text-red-600 mt-xs">{errors.type}</p>}
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-caption text-gray mb-md font-medium">Target Audience</label>
          <select
            name="targetAudience"
            value={formData.targetAudience}
            onChange={handleChange}
            className="w-full px-md py-md border border-light-gray rounded-lg focus:outline-none focus:border-black focus:bg-bone transition-colors"
          >
            <option value="All">All</option>
            <option value="Active Members">Active Members</option>
            <option value="Recent Joiners">Recent Joiners</option>
            <option value="Custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-caption text-gray mb-md font-medium">
          Additional Notes (optional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional notes"
          rows={3}
          className="w-full px-md py-md border border-light-gray rounded-lg focus:outline-none focus:border-black focus:bg-bone transition-colors resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-md justify-end pt-lg border-t border-light-gray">
        {onCancel && (
          <Button onClick={onCancel} variant="secondary" disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? 'Saving...' : initialData ? 'Update Campaign' : 'Create Campaign'}
        </Button>
      </div>
    </form>
  )
}
