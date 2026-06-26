'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCampaign, Campaign, CampaignReport } from '@/hooks/useCampaign'
import { Button } from '@/components/Common/Button'
import { Badge } from '@/components/Common/Badge'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft } from 'phosphor-react'

export default function CampaignDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { user, role, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const id = params.id as string

    const {
        getCampaign,
        memberConfirm,
        memberReject,
        coManagerApprove,
        coManagerReject,
        coManagerExempt,
        closeCampaign,
        getReport,
    } = useCampaign()

    const isManager = role === 'co_manager' || role === 'manager' || role === 'owner'

    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const [report, setReport] = useState<CampaignReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isActing, setIsActing] = useState(false)

    useEffect(() => {
        if (authLoading) return
        loadData()
    }, [id, authLoading])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const data = await getCampaign(id)
            setCampaign(data)
            if (isManager) {
                try { setReport(await getReport(id)) } catch { /* non-fatal */ }
            }
        } catch {
            toast('Không thể tải khoản thu', 'error')
            router.push('/app/campaigns')
        } finally { setIsLoading(false) }
    }

    const myAssignment = campaign?.assignments?.find((a) => a.user_id === user?.id)

    const act = async (fn: () => Promise<unknown>, successMsg: string) => {
        setIsActing(true)
        try { await fn(); toast(successMsg, 'success'); loadData() }
        catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
        finally { setIsActing(false) }
    }

    const assignmentLabel = (s: string) => ({
        pending_confirmation: 'Chờ xác nhận',
        confirmed: 'Đã xác nhận',
        rejected: 'Từ chối',
        approved: 'Đã duyệt',
        exempted: 'Miễn',
    }[s] || s)

    const assignmentVariant = (s: string): 'approved' | 'pending' | 'rejected' | 'info' => {
        if (s === 'approved' || s === 'confirmed') return 'approved'
        if (s === 'rejected') return 'rejected'
        if (s === 'exempted') return 'info'
        return 'pending'
    }

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

    if (isLoading) return (
        <div className="min-h-screen p-6 flex items-center justify-center">
            <div className="animate-pulse space-y-4 w-full max-w-lg">
                <div className="h-8 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
        </div>
    )

    if (!campaign) return null

    return (
        <div className="min-h-screen px-6 pt-8 pb-20 md:px-12 space-y-8" style={{ color: '#0F0E0C' }}>
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium" style={{ color: '#6B6660' }}>
                <ArrowLeft size={18} />Quay lại
            </button>

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-light mb-2">{campaign.name}</h1>
                    <p className="text-sm" style={{ color: '#9F9A93' }}>
                        {campaign.amount_per_member?.toLocaleString('vi-VN')}₫ / thành viên
                        {campaign.deadline && ` · Hạn: ${fmtDate(campaign.deadline)}`}
                    </p>
                </div>
                <Badge variant={campaign.status === 'active' ? 'approved' : 'rejected'}>
                    {campaign.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}
                </Badge>
            </div>

            {campaign.description && (
                <p className="text-sm leading-relaxed" style={{ color: '#6B6660' }}>{campaign.description}</p>
            )}

            {isManager && report && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Đã xác nhận', value: report.confirmed },
                        { label: 'Đã duyệt', value: report.approved },
                        { label: 'Từ chối', value: report.rejected },
                        { label: 'Miễn', value: report.exempted },
                        { label: 'Chờ', value: report.pending },
                        { label: 'Thu được', value: `${report.collected_amount?.toLocaleString('vi-VN')}₫` },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl p-4" style={{ background: '#F5F3F0' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: '#9F9A93' }}>{s.label}</p>
                            <p className="text-xl font-semibold">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {!isManager && myAssignment?.status === 'pending_confirmation' && (
                <div className="rounded-2xl p-5 border" style={{ borderColor: '#E5E5E5' }}>
                    <p className="font-semibold mb-1">Bạn được phân công vào khoản thu này</p>
                    <p className="text-sm mb-4" style={{ color: '#6B6660' }}>
                        {campaign.amount_per_member?.toLocaleString('vi-VN')}₫ cần đóng góp
                    </p>
                    <div className="flex gap-3">
                        <button disabled={isActing} onClick={() => act(() => memberConfirm(id, user!.id), 'Đã xác nhận tham gia')}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#3D5A50', color: '#fff' }}>
                            Xác nhận tham gia
                        </button>
                        <button disabled={isActing} onClick={() => act(() => memberReject(id, user!.id), 'Đã từ chối')}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: '#E5E5E5', color: '#E53E3E' }}>
                            Từ chối
                        </button>
                    </div>
                </div>
            )}

            {!isManager && myAssignment && myAssignment.status !== 'pending_confirmation' && (
                <div className="rounded-2xl p-4" style={{ background: '#F5F3F0' }}>
                    <p className="text-sm font-medium">Trạng thái: <span className="font-semibold">{assignmentLabel(myAssignment.status)}</span></p>
                </div>
            )}

            {isManager && campaign.assignments && campaign.assignments.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Danh sách phân công</h2>
                    <div className="space-y-3">
                        {campaign.assignments.map((a) => (
                            <div key={a.user_id} className="flex items-center justify-between rounded-xl p-4" style={{ background: '#F5F3F0' }}>
                                <div>
                                    <p className="font-medium text-sm">{a.full_name || a.user_id}</p>
                                    <Badge variant={assignmentVariant(a.status)}>{assignmentLabel(a.status)}</Badge>
                                </div>
                                {a.status === 'confirmed' && (
                                    <div className="flex gap-2">
                                        <button disabled={isActing} onClick={() => act(() => coManagerApprove(id, a.user_id), 'Đã duyệt')}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#3D5A50', color: '#fff' }}>Duyệt</button>
                                        <button disabled={isActing} onClick={() => act(() => coManagerExempt(id, a.user_id), 'Đã miễn')}
                                            className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#E5E5E5', color: '#4A4540' }}>Miễn</button>
                                        <button disabled={isActing} onClick={() => act(() => coManagerReject(id, a.user_id), 'Đã từ chối')}
                                            className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#FEE2E2', color: '#E53E3E' }}>Từ chối</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isManager && campaign.status === 'active' && (
                <button disabled={isActing} onClick={() => act(closeCampaign.bind(null, id), 'Đã đóng khoản thu')}
                    className="w-full py-3 rounded-xl text-sm font-semibold border" style={{ borderColor: '#E53E3E', color: '#E53E3E' }}>
                    Đóng khoản thu
                </button>
            )}
        </div>
    )
}
