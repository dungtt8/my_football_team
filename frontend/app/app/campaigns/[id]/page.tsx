'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useCampaign, Campaign } from '@/hooks/useCampaign'
import { Button } from '@/components/Common/Button'
import { Badge } from '@/components/Common/Badge'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft, Trash } from 'phosphor-react'

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const id = params.id as string

  const {
    getCampaignDetail,
    updateCampaign,
    deleteCampaign,
  } = useCampaign()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadCampaignDetail()
  }, [id])

  const loadCampaignDetail = async () => {
    setIsLoading(true)
    try {
      const data = await getCampaignDetail(id)
      setCampaign(data)
    } catch (error) {
      console.error('Error loading campaign:', error)
      toast('Failed to load campaign', 'error')
      router.push('/app/campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteCampaign(id)
      toast('Campaign deleted successfully', 'success')
      router.push('/app/campaigns')
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast('Failed to delete campaign', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string): 'approved' | 'pending' | 'rejected' | 'info' => {
    switch (status) {
      case 'active':
        return 'approved'
      case 'ended':
        return 'rejected'
      case 'pending_approval':
        return 'pending'
      case 'draft':
        return 'info'
      default:
        return 'info'
    }
  }

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-lg md:p-xl flex items-center justify-center">
        <div className="animate-pulse space-y-lg w-full max-w-2xl">
          <div className="h-8 bg-bone rounded w-1/2"></div>
          <div className="h-4 bg-bone rounded w-full"></div>
          <div className="h-4 bg-bone rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-white p-lg md:p-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-body text-gray mb-lg">Campaign not found</p>
          <Button onClick={() => router.push('/app/campaigns')}>Back to Campaigns</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-lg md:p-xl">
      {/* Header with Back Button */}
      <div className="mb-xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-sm text-gray hover:text-black transition-colors mb-lg"
        >
          <ArrowLeft size={20} />
          <span className="text-caption font-medium">Back</span>
        </button>

        <div className="flex items-start justify-between gap-lg">
          <div className="flex-1">
            <h1 className="text-section-title font-bold text-black mb-md">{campaign.title}</h1>
            <div className="flex items-center gap-md">
              <Badge variant={getStatusColor(campaign.status)}>
                {campaign.status.replace('_', ' ')}
              </Badge>
              <p className="text-caption text-gray">By {campaign.createdBy}</p>
            </div>
          </div>

          {campaign.status === 'draft' && (
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-100 text-red-700 hover:bg-red-200"
            >
              <Trash size={20} />
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* Left Column - Campaign Details */}
        <div className="lg:col-span-2 space-y-xl">
          {/* Description */}
          <section className="p-lg border border-light-gray rounded-lg bg-white">
            <h2 className="text-heading3 font-bold text-black mb-md">Description</h2>
            <p className="text-body text-gray whitespace-pre-wrap">{campaign.description}</p>
          </section>

          {/* Campaign Info */}
          <section className="p-lg border border-light-gray rounded-lg bg-white">
            <h2 className="text-heading3 font-bold text-black mb-lg">Campaign Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              <div>
                <p className="text-caption text-gray mb-xs">Type</p>
                <p className="text-body font-medium text-black">{campaign.type}</p>
              </div>
              <div>
                <p className="text-caption text-gray mb-xs">Target Audience</p>
                <p className="text-body font-medium text-black">{campaign.targetAudience}</p>
              </div>
              <div>
                <p className="text-caption text-gray mb-xs">Start Date</p>
                <p className="text-body font-medium text-black">{formatDate(campaign.startDate)}</p>
              </div>
              <div>
                <p className="text-caption text-gray mb-xs">End Date</p>
                <p className="text-body font-medium text-black">{formatDate(campaign.endDate)}</p>
              </div>
            </div>
          </section>

          {/* Participants */}
          <section className="p-lg border border-light-gray rounded-lg bg-white">
            <h2 className="text-heading3 font-bold text-black mb-md">Participants</h2>
            <p className="text-lg font-bold text-black">{campaign.participantCount}</p>
            <p className="text-caption text-gray mt-sm">Total members joined this campaign</p>
          </section>

          {campaign.notes && (
            <section className="p-lg border border-light-gray rounded-lg bg-bone">
              <h2 className="text-heading3 font-bold text-black mb-md">Notes</h2>
              <p className="text-body text-gray whitespace-pre-wrap">{campaign.notes}</p>
            </section>
          )}
        </div>

        {/* Right Column - Stats & Actions */}
        <div className="space-y-lg">
          {/* Quick Stats */}
          <div className="p-lg border border-light-gray rounded-lg bg-bone space-y-md">
            <div>
              <p className="text-caption text-gray mb-xs">Created</p>
              <p className="text-body font-medium text-black">
                {formatDate(campaign.createdDate || '')}
              </p>
            </div>
            <div>
              <p className="text-caption text-gray mb-xs">Status</p>
              <Badge variant={getStatusColor(campaign.status)}>
                {campaign.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-md">
            {campaign.status === 'draft' && (
              <>
                <Button
                  onClick={() => router.push(`/app/campaigns/${id}/edit`)}
                  className="w-full"
                >
                  Edit Campaign
                </Button>
              </>
            )}

            {campaign.status === 'active' && (
              <Button onClick={() => toast('Join feature coming soon')} className="w-full">
                Join Campaign
              </Button>
            )}

            <Button
              onClick={() => router.push('/app/campaigns')}
              variant="secondary"
              className="w-full"
            >
              Back to List
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
