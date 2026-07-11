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
        uploadBillImage,
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
    const [billFile, setBillFile] = useState<File | null>(null)
    const [billPreview, setBillPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)

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

    // fund_month (YYYY-MM) is only set for auto-created team_fund campaigns;
    // fall back to the campaign's created_at month for any other campaign type.
    const campaignMonthLabel = (c: Campaign) => {
        if (c.fund_month) {
            const [year, month] = c.fund_month.split('-')
            return `${month}/${year}`
        }
        if (c.created_at) {
            const d = new Date(c.created_at)
            return `${d.getMonth() + 1}/${d.getFullYear()}`
        }
        return ''
    }

    const act = async (fn: () => Promise<unknown>, successMsg: string) => {
        setIsActing(true)
        try { await fn(); toast(successMsg, 'success'); loadData() }
        catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
        finally { setIsActing(false) }
    }

    const assignmentLabel = (s: string) => ({
        pending_confirmation: 'Chờ xác nhận',
        pending_approval: 'Chờ duyệt',
        rejected: 'Từ chối',
        approved: 'Đã duyệt',
        exempt: 'Miễn',
    }[s] || s)

    const assignmentVariant = (s: string): 'approved' | 'pending' | 'rejected' | 'info' => {
        if (s === 'approved') return 'approved'
        if (s === 'rejected') return 'rejected'
        if (s === 'exempt') return 'info'
        return 'pending' // pending_confirmation, pending_approval
    }

    const handleSelectBillFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        // Revoke any previously created object URL before creating a new one,
        // so switching the selected file doesn't leak the old blob URL.
        setBillPreview(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(file)
        })
        setBillFile(file)
    }

    // Revoke the object URL on unmount (or whenever it changes) so it isn't
    // leaked if the user navigates away without submitting/clearing the form.
    useEffect(() => {
        return () => {
            if (billPreview) URL.revokeObjectURL(billPreview)
        }
    }, [billPreview])

    const handleConfirmWithBill = async () => {
        if (!billFile) { toast('Vui lòng chọn ảnh hoá đơn/chuyển khoản', 'error'); return }
        setIsActing(true)
        setIsUploading(true)
        try {
            const url = await uploadBillImage(billFile)
            setIsUploading(false)
            await memberConfirm(id, user!.id, url)
            toast('Đã xác nhận đóng quỹ', 'success')
            setBillFile(null)
            setBillPreview(null)
            loadData()
        } catch (e: any) {
            toast(e?.message || 'Lỗi', 'error')
        } finally {
            setIsActing(false)
            setIsUploading(false)
        }
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
        <div className="min-h-screen px-6 pt-8 pb-20 md:px-12 space-y-8" style={{ color: '#0B1220' }}>
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-medium" style={{ color: '#7A8699' }}>
                <ArrowLeft size={18} />Quay lại
            </button>

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-head)', letterSpacing: '-0.02em' }}>{campaign.name}</h1>
                    <p className="text-sm" style={{ color: '#7A8699' }}>
                        {campaign.amount_per_member?.toLocaleString('vi-VN')}₫ / thành viên
                        {campaign.deadline && ` · Hạn: ${fmtDate(campaign.deadline)}`}
                    </p>
                </div>
                <Badge variant={campaign.status === 'active' ? 'approved' : 'rejected'}>
                    {campaign.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}
                </Badge>
            </div>

            {campaign.description && (
                <p className="text-sm leading-relaxed" style={{ color: '#7A8699' }}>{campaign.description}</p>
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
                        <div key={s.label} className="rounded-xl p-4" style={{ background: '#F4F7FB' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: '#7A8699' }}>{s.label}</p>
                            <p className="text-xl font-semibold">{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Own payment confirmation — shown to EVERY member with an assignment,
                including co_manager/owner, since managers are also auto-assigned
                to team_fund campaigns and must confirm their own payment just
                like anyone else. This is independent of the manager-only admin
                panel below (a manager sees both). */}
            {myAssignment?.status === 'pending_confirmation' && (
                <div className="rounded-2xl p-5 border" style={{ borderColor: '#E7ECF3' }}>
                    <p className="font-semibold mb-1">Bạn có 1 yêu cầu đóng quỹ tháng {campaignMonthLabel(campaign)}</p>
                    <p className="text-sm mb-4" style={{ color: '#7A8699' }}>
                        {campaign.amount_per_member?.toLocaleString('vi-VN')}₫ cần đóng góp
                    </p>

                    <label className="block text-xs font-medium mb-2" style={{ color: '#7A8699' }}>
                        Ảnh hoá đơn / minh chứng chuyển khoản
                    </label>
                    <label
                        htmlFor="bill-image-input"
                        className="flex flex-col items-center justify-center rounded-xl border border-dashed cursor-pointer mb-4 overflow-hidden"
                        style={{ borderColor: '#E7ECF3', minHeight: '120px', background: '#F4F7FB' }}
                    >
                        {billPreview ? (
                            <img src={billPreview} alt="Xem trước hoá đơn" className="w-full max-h-56 object-contain" />
                        ) : (
                            <span className="text-sm py-8" style={{ color: '#7A8699' }}>Chạm để chọn ảnh từ máy</span>
                        )}
                    </label>
                    <input
                        id="bill-image-input"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleSelectBillFile}
                        className="hidden"
                    />

                    <div className="flex gap-3">
                        <button disabled={isActing || !billFile} onClick={handleConfirmWithBill}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: '#027A48', color: '#fff' }}>
                            {isUploading ? 'Đang tải ảnh lên...' : isActing ? 'Đang xác nhận...' : 'Xác nhận đã đóng quỹ'}
                        </button>
                        <button disabled={isActing} onClick={() => act(() => memberReject(id, user!.id), 'Đã từ chối')}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium border" style={{ borderColor: '#E7ECF3', color: '#F04438' }}>
                            Từ chối
                        </button>
                    </div>
                </div>
            )}

            {myAssignment && myAssignment.status !== 'pending_confirmation' && (
                <div className="rounded-2xl p-4" style={{ background: '#F4F7FB' }}>
                    <p className="text-sm font-medium">Trạng thái: <span className="font-semibold">{assignmentLabel(myAssignment.status)}</span></p>
                </div>
            )}

            {isManager && campaign.assignments && campaign.assignments.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Danh sách phân công</h2>
                    <div className="space-y-3">
                        {campaign.assignments.map((a) => (
                            <div key={a.user_id} className="flex items-center justify-between rounded-xl p-4" style={{ background: '#F4F7FB' }}>
                                <div>
                                    <p className="font-medium text-sm">{a.full_name || a.user_id}</p>
                                    <Badge variant={assignmentVariant(a.status)}>{assignmentLabel(a.status)}</Badge>
                                </div>
                                {a.bill_image_url && (
                                    <a href={a.bill_image_url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs font-medium underline mr-2" style={{ color: '#027A48' }}>
                                        Xem hoá đơn
                                    </a>
                                )}
                                {a.status === 'pending_approval' && (
                                    <div className="flex gap-2">
                                        <button disabled={isActing} onClick={() => act(() => coManagerApprove(id, a.user_id), 'Đã duyệt')}
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#027A48', color: '#fff' }}>Duyệt</button>
                                        <button disabled={isActing} onClick={() => act(() => coManagerExempt(id, a.user_id), 'Đã miễn')}
                                            className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#E7ECF3', color: '#3A4658' }}>Miễn</button>
                                        <button disabled={isActing} onClick={() => act(() => coManagerReject(id, a.user_id), 'Đã từ chối')}
                                            className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#FEECEB', color: '#F04438' }}>Từ chối</button>
                                    </div>
                                )}
                                {a.status === 'pending_confirmation' && (
                                    <button disabled={isActing} onClick={() => act(() => coManagerExempt(id, a.user_id), 'Đã miễn')}
                                        className="px-3 py-1.5 rounded-lg text-xs" style={{ background: '#E7ECF3', color: '#3A4658' }}>Miễn</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isManager && campaign.status === 'active' && (
                <button disabled={isActing} onClick={() => act(closeCampaign.bind(null, id), 'Đã đóng khoản thu')}
                    className="w-full py-3 rounded-xl text-sm font-semibold border" style={{ borderColor: '#F04438', color: '#F04438' }}>
                    Đóng khoản thu
                </button>
            )}
        </div>
    )
}
