'use client'

import React, { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'

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
    const [deadline, setDeadline] = useState<PaymentDeadlineInfo | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadPaymentInfo()
    }, [])

    const loadPaymentInfo = async () => {
        try {
            setLoading(true)
            // First get team settings which includes fund info
            const settingsResponse = await request<any>('/team/settings', 'GET')

            if (settingsResponse?.finance?.is_payment_deadline_active && settingsResponse?.fund) {
                setDeadline({
                    payment_deadline: settingsResponse.fund,
                    is_active: true
                })
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
        <div
            style={{
                background: '#fff8e6',
                border: '2px solid #ffb84d',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
                textAlign: 'center'
            }}
        >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#ff8c00' }}>
                💳 Hạn chót thanh toán
            </h3>

            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#666' }}>
                Vui lòng thanh toán trước hạn chót
            </p>

            {qr_code_url && (
                <div style={{ marginBottom: '12px' }}>
                    <img
                        src={qr_code_url}
                        alt="Payment QR Code"
                        style={{
                            maxWidth: '200px',
                            maxHeight: '200px',
                            border: '2px solid #ffb84d',
                            borderRadius: '4px',
                            padding: '8px',
                            background: 'white',
                            display: 'inline-block'
                        }}
                    />
                </div>
            )}

            {(bank_name || bank_account_number) && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                    {bank_name && (
                        <p style={{ margin: '4px 0' }}>
                            <strong>Ngân hàng:</strong> {bank_name}
                        </p>
                    )}
                    {bank_account_number && (
                        <p style={{ margin: '4px 0' }}>
                            <strong>Tài khoản:</strong> {bank_account_number}
                        </p>
                    )}
                </div>
            )}

            {!qr_code_url && !bank_name && !bank_account_number && (
                <p style={{ fontSize: '12px', color: '#999', margin: '0' }}>
                    Thông tin thanh toán chưa được cập nhật
                </p>
            )}
        </div>
    )
}
