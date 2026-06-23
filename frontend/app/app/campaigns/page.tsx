'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCampaign, Campaign } from '@/hooks/useCampaign'
import { CampaignStatsBar } from '@/components/Campaign/CampaignStatsBar'
import { CampaignList } from '@/components/Campaign/CampaignList'
import { CampaignApprovalQueue } from '@/components/Campaign/CampaignApprovalQueue'
import { Button } from '@/components/Common/Button'
import { useToast } from '@/hooks/useToast'
import { Plus } from 'phosphor-react'

type TabType = 'all' | 'active' | 'ended' | 'drafts' | 'pending_approval'

export default function CampaignPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    listCampaigns,
    getPendingApprovals,
    approveCampaign,
    loading,
  } = useCampaign()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<Campaign[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalParticipants: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [allCampaigns, approvals] = await Promise.all([
        listCampaigns(),
        getPendingApprovals(),
      ])

      setCampaigns(allCampaigns)
      setPendingApprovals(approvals as any)

      // Calculate stats
      const activeCampaigns = allCampaigns.filter((c) => c.status === 'active').length
      const totalParticipants = allCampaigns.reduce(
        (sum, c) => sum + (c.participantCount || 0),
        0
      )

      setStats({
        totalCampaigns: allCampaigns.length,
        activeCampaigns,
        totalParticipants,
      })

      // Apply initial filter
      filterCampaigns(allCampaigns, 'all')
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast('Không thể tải chiến dịch', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const filterCampaigns = (items: Campaign[], tab: TabType) => {
    let filtered = items

    if (tab === 'active') {
      filtered = items.filter((c) => c.status === 'active')
    } else if (tab === 'ended') {
      filtered = items.filter((c) => c.status === 'ended')
    } else if (tab === 'drafts') {
      filtered = items.filter((c) => c.status === 'draft')
    } else if (tab === 'pending_approval') {
      filtered = items.filter((c) => c.status === 'pending_approval')
    }

    setFilteredCampaigns(filtered)
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    filterCampaigns(campaigns, tab)
  }

  const handleCampaignClick = (id: string) => {
    router.push(`/app/campaigns/${id}`)
  }

  const handleApproveCampaign = async (id: string) => {
    try {
      await approveCampaign(id)
      toast('Chiến dịch được phê duyệt thành công', 'success')
      loadData()
    } catch (error) {
      console.error('Error approving campaign:', error)
      toast('Không thể phê duyệt chiến dịch', 'error')
    }
  }

  const handleRejectCampaign = async (id: string, reason?: string) => {
    // TODO: Implement reject endpoint
    toast('Tính năng từ chối sắp ra mắt', 'info')
  }

  const tabs: Array<{ id: TabType; label: string; count?: number }> = [
    { id: 'all', label: 'Tất cả', count: campaigns.length },
    { id: 'active', label: 'Đang hoạt động', count: stats.activeCampaigns },
    { id: 'ended', label: 'Kết thúc' },
    { id: 'drafts', label: 'Bản nháp' },
    { id: 'pending_approval', label: 'Chờ duyệt' },
  ]

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-serif font-light mb-2" style={{ color: '#0F0E0C' }}>Chiến dịch</h1>
        <p className="text-base font-light mb-6" style={{ color: '#6B6660' }}>Tạo và quản lý chiến dịch đội</p>
        <Button onClick={() => router.push('/app/campaigns/new')} className="flex items-center gap-2">
          <Plus size={20} />
          Chiến dịch mới
        </Button>
      </div>

      {/* Stats Section */}
      <div className="mb-8">
        <CampaignStatsBar
          totalCampaigns={stats.totalCampaigns}
          activeCampaigns={stats.activeCampaigns}
          totalParticipants={stats.totalParticipants}
          isLoading={isLoading}
        />
      </div>

      {/* Tabs and View Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-black hover:bg-slate-100'
              }`}
              style={{
                background: activeTab === tab.id ? '#3D5A50' : 'transparent'
              }}
            >
              {tab.label}
              {tab.count !== undefined && ` (${tab.count})`}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-md justify-end items-center">
          <span className="text-caption text-gray">Xem:</span>
          <div className="flex gap-xs bg-bone rounded-full p-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-md py-xs rounded-full text-caption font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-black'
                  : 'text-gray hover:text-black'
              }`}
            >
              Lưới
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-md py-xs rounded-full text-caption font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-black'
                  : 'text-gray hover:text-black'
              }`}
            >
              Danh sách
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Desktop: Two Column, Mobile: Single */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* Campaign List - 70% on desktop */}
        <div className="lg:col-span-2">
          <CampaignList
            campaigns={filteredCampaigns}
            isLoading={isLoading}
            onItemClick={handleCampaignClick}
            emptyMessage={`Không tìm thấy chiến dịch`}
            viewMode={viewMode}
          />
        </div>

        {/* Approval Queue - 30% on desktop */}
        {pendingApprovals.length > 0 && (
          <div className="lg:col-span-1">
            <CampaignApprovalQueue
              campaigns={pendingApprovals}
              isLoading={isLoading}
              onApprove={handleApproveCampaign}
              onReject={handleRejectCampaign}
            />
          </div>
        )}
      </div>
    </div>
  )
}
