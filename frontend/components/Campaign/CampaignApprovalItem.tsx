'use client'

import React, { useState } from 'react'
import { Button } from '@/components/Common/Button'
import { Badge } from '@/components/Common/Badge'
import { Campaign } from '@/hooks/useCampaign'

interface CampaignApprovalItemProps {
    campaign: Campaign
    onApprove: (id: string) => void
    onReject: (id: string, reason?: string) => void
    isLoading?: boolean
}

export const CampaignApprovalItem: React.FC<CampaignApprovalItemProps> = ({
    campaign,
    onApprove,
    onReject,
    isLoading = false,
}) => {
    const [showRejectReason, setShowRejectReason] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    const handleRejectClick = () => {
        if (showRejectReason && rejectReason.trim()) {
            onReject(campaign.id, rejectReason)
            setRejectReason('')
            setShowRejectReason(false)
        } else {
            setShowRejectReason(!showRejectReason)
        }
    }

    const formatDate = (date: string): string => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    return (
        <div className="p-lg border border-light-gray rounded-lg bg-white hover:bg-bone transition-colors">
            <div className="mb-md">
                <h3 className="text-lg font-bold text-black mb-xs">{campaign.name}</h3>
                <p className="text-caption text-gray">{campaign.amount_per_member?.toLocaleString('vi-VN')}₫/thành viên</p>
            </div>

            <p className="text-body text-gray mb-md line-clamp-2">{campaign.description}</p>

            <p className="text-caption text-gray mb-lg">{campaign.deadline ? `Hạn: ${formatDate(campaign.deadline)}` : 'Không có hạn'}</p>

            {showRejectReason && (
                <div className="mb-lg">
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason"
                        rows={3}
                        className="w-full px-md py-md border border-light-gray rounded-lg focus:outline-none focus:border-black text-caption resize-none"
                    />
                </div>
            )}

            <div className="flex gap-md">
                <Button
                    onClick={() => onApprove(campaign.id)}
                    disabled={isLoading || showRejectReason}
                    className="flex-1 bg-green-100 text-green-700 hover:bg-green-200"
                >
                    Approve
                </Button>
                <Button
                    onClick={handleRejectClick}
                    disabled={isLoading}
                    className="flex-1 bg-red-100 text-red-700 hover:bg-red-200"
                >
                    {showRejectReason && rejectReason.trim() ? 'Confirm Reject' : 'Reject'}
                </Button>
                {showRejectReason && (
                    <Button
                        onClick={() => {
                            setShowRejectReason(false)
                            setRejectReason('')
                        }}
                        disabled={isLoading}
                        variant="secondary"
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                )}
            </div>
        </div>
    )
}
