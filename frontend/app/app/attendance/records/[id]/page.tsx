'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAttendance, AttendanceRecord } from '@/hooks/useAttendance'
import { useToast } from '@/hooks/useToast'

const G = {
    bg: '#070B14', glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)', red: '#FF6B6B', redDim: 'rgba(255,107,107,0.12)',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

const SESSION_TYPE_LABEL: Record<string, string> = {
    training: 'Tập luyện',
    match: 'Trận đấu',
}

export default function AttendanceDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { toast } = useToast()
    const { getAttendanceDetail, loading } = useAttendance()

    const [record, setRecord] = useState<AttendanceRecord | null>(null)
    const [notFound, setNotFound] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        const loadRecord = async () => {
            try {
                const id = params.id as string
                if (id) {
                    // getAttendanceDetail returns `undefined` for a genuine not-found,
                    // but throws for network/auth failures — handle them separately so
                    // the user sees the right message instead of always "not found".
                    const data = await getAttendanceDetail(id)
                    if (!data) setNotFound(true)
                    setRecord(data ?? null)
                }
            } catch (error) {
                console.error('Error loading attendance record:', error)
                setLoadError('Không thể tải bản ghi điểm danh. Vui lòng thử lại.')
                toast('Không thể tải bản ghi điểm danh', 'error')
            }
        }

        loadRecord()
    }, [params.id])

    const formatDate = (dateString?: string) => {
        if (!dateString) return '--'
        return new Date(dateString).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const getResponseStyle = (response: 'yes' | 'no' | null | undefined) => {
        if (response === 'yes') return { bg: G.accentDim, text: G.accent, label: 'Đã tham gia' }
        if (response === 'no') return { bg: G.redDim, text: G.red, label: 'Vắng mặt' }
        return { bg: 'rgba(255,255,255,0.08)', text: G.t2, label: 'Chưa phản hồi' }
    }

    if (loading && !record) {
        return (
            <div style={{ padding: '24px 16px', paddingBottom: '100px', minHeight: '100vh' }}>
                <div style={{ height: '400px', background: G.glass, borderRadius: '16px', animation: 'pulse 2s infinite' }} />
            </div>
        )
    }

    if (loadError) {
        return (
            <div style={{ padding: '24px 16px', paddingBottom: '100px', minHeight: '100vh' }}>
                <button onClick={() => router.back()} style={{
                    marginBottom: '20px', padding: '8px 12px', background: 'transparent', color: G.t1,
                    border: `1px solid ${G.glassBorder}`, borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                }}>← Quay lại</button>
                <p style={{ color: G.red, textAlign: 'center', marginTop: '40px' }}>{loadError}</p>
            </div>
        )
    }

    if (notFound || !record) {
        return (
            <div style={{ padding: '24px 16px', paddingBottom: '100px', minHeight: '100vh' }}>
                <button onClick={() => router.back()} style={{
                    marginBottom: '20px', padding: '8px 12px', background: 'transparent', color: G.t1,
                    border: `1px solid ${G.glassBorder}`, borderRadius: '10px', fontSize: '13px', cursor: 'pointer',
                }}>← Quay lại</button>
                <p style={{ color: G.t2, textAlign: 'center', marginTop: '40px' }}>Không tìm thấy bản ghi điểm danh</p>
            </div>
        )
    }

    const responseStyle = getResponseStyle(record.response)

    return (
        <div style={{ padding: '24px 16px', paddingBottom: '100px', minHeight: '100vh' }}>
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                style={{
                    marginBottom: '20px', padding: '8px 12px', background: 'transparent', color: G.t1,
                    border: `1px solid ${G.glassBorder}`, borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
            >
                ← Quay lại
            </button>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: G.t1 }}>Chi tiết điểm danh</h1>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: G.t2 }}>
                    {formatDate(record.session_date || record.created_at || undefined)}
                </p>
            </div>

            {/* Main Card */}
            <div style={{ border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '20px', background: G.glass, backdropFilter: 'blur(12px)', marginBottom: '20px' }}>
                {/* Response Badge */}
                <div style={{ marginBottom: '20px' }}>
                    <span style={{
                        display: 'inline-block', padding: '8px 14px', background: responseStyle.bg, color: responseStyle.text,
                        borderRadius: '999px', fontSize: '13px', fontWeight: 700,
                    }}>
                        {responseStyle.label}
                    </span>
                </div>

                {/* Detail Grid */}
                <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                        <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: G.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Loại buổi</p>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: G.t1 }}>
                            {SESSION_TYPE_LABEL[record.session_type ?? ''] || 'Buổi tập'}
                        </p>
                    </div>

                    {record.location && (
                        <div>
                            <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: G.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Địa điểm</p>
                            <p style={{ margin: 0, fontSize: '15px', color: G.t1 }}>{record.location}</p>
                        </div>
                    )}

                    {record.responded_at && (
                        <div>
                            <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: G.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Thời điểm phản hồi</p>
                            <p style={{ margin: 0, fontSize: '15px', color: G.t1 }}>
                                {new Date(record.responded_at).toLocaleString('vi-VN')}
                            </p>
                        </div>
                    )}

                    {record.check_in_deadline && (
                        <div>
                            <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: G.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hạn phản hồi</p>
                            <p style={{ margin: 0, fontSize: '15px', color: G.t1 }}>
                                {new Date(record.check_in_deadline).toLocaleString('vi-VN')}
                            </p>
                        </div>
                    )}

                    {record.description && (
                        <div>
                            <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: G.t3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ghi chú</p>
                            <p style={{ margin: 0, fontSize: '15px', color: G.t1 }}>{record.description}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
