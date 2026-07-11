'use client'

import React, { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'

interface PaymentDeadlineInfo {
    payment_deadline: {
        bank_account_number?: string
        bank_name?: string
        qr_code_url?: string
    } | null
    is_active: boolean
}

export const PaymentQRDisplay: React.FC = () => {
    const { request } = useApi()
    const { isLoading: authLoading } = useAuth()
    const [deadline, setDeadline] = useState<PaymentDeadlineInfo | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (authLoading) return
        loadPaymentInfo()
    }, [authLoading])

    const loadPaymentInfo = async () => {
        try {
            setLoading(true)
            // First get team settings which includes fund info
            const settingsResponse = await request<any>('/team/settings', 'GET')

            // Validate response is object before accessing properties
            if (settingsResponse && typeof settingsResponse === 'object' && !Array.isArray(settingsResponse)) {
                if (settingsResponse?.finance?.is_payment_deadline_active && settingsResponse?.fund) {
                    setDeadline({
                        payment_deadline: settingsResponse.fund,
                        is_active: true
                    })
                }
            } else {
                console.warn('Invalid payment settings response:', typeof settingsResponse)
            }
        } catch (error) {
            console.error('Failed to load payment info:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return null
    if (!deadline?.is_active || !deadline.payment_deadline) return null

    const { bank_name, bank_account_number, qr_code_url } = deadline.payment_deadline

    return (
        <div className="card pad" style={{ border: '1.5px solid var(--accent)', background: 'linear-gradient(180deg,var(--accent-050),#fff)', textAlign: 'center' }}>
            <span className="chip warn" style={{ display: 'inline-flex' }}>💳 HẠN CHÓT THANH TOÁN</span>

            <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ink-3)' }}>
                Vui lòng thanh toán trước hạn chót
            </p>

            {qr_code_url && (
                <div style={{ margin: '12px 0' }}>
                    <img
                        src={qr_code_url}
                        alt="Payment QR Code"
                        style={{
                            maxWidth: 200,
                            maxHeight: 200,
                            border: '1px solid var(--line)',
                            borderRadius: 12,
                            padding: 8,
                            background: 'var(--surface)',
                            display: 'inline-block'
                        }}
                    />
                </div>
            )}

            {(bank_name || bank_account_number) && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
                    {bank_name && (
                        <p style={{ margin: '4px 0' }}>
                            <b style={{ color: 'var(--ink)' }}>Ngân hàng:</b> {bank_name}
                        </p>
                    )}
                    {bank_account_number && (
                        <p style={{ margin: '4px 0' }}>
                            <b style={{ color: 'var(--ink)' }}>Tài khoản:</b> {bank_account_number}
                        </p>
                    )}
                </div>
            )}

            {!qr_code_url && !bank_name && !bank_account_number && (
                <p style={{ fontSize: 12, color: 'var(--ink-4)', margin: '12px 0 0' }}>
                    Thông tin thanh toán chưa được cập nhật
                </p>
            )}
        </div>
    )
}
