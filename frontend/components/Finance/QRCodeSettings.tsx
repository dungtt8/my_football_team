'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Bank, QrCode, UploadSimple, Trash, CheckCircle } from 'phosphor-react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

interface PaymentSettings {
    bank_account_number?: string
    bank_name?: string
    qr_code_url?: string
}

interface QRCodeSettingsProps {
    isOwner: boolean
    readOnly?: boolean
}

const inputClass = 'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors'

const fieldStyle = (editable: boolean): React.CSSProperties => ({
    borderColor: 'var(--line)',
    background: 'var(--surface-2)',
    color: 'var(--ink)',
    opacity: editable ? 1 : 0.7,
    cursor: editable ? 'text' : 'default',
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
})

export const QRCodeSettings: React.FC<QRCodeSettingsProps> = ({ isOwner, readOnly = false }) => {
    const { request } = useApi()
    const { isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [settings, setSettings] = useState<PaymentSettings>({})
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [bankAccount, setBankAccount] = useState('')
    const [bankName, setBankName] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    useEffect(() => {
        if (authLoading) return
        loadSettings()
    }, [authLoading])

    const loadSettings = async () => {
        try {
            setLoading(true)
            const response = await request<any>('/team/settings', 'GET')

            // Validate response is object before accessing properties
            if (response && typeof response === 'object' && !Array.isArray(response) && response?.fund) {
                setSettings(response.fund)
                setBankAccount(response.fund.bank_account_number || '')
                setBankName(response.fund.bank_name || '')
                if (response.fund.qr_code_url) {
                    setPreviewUrl(response.fund.qr_code_url)
                }
            } else {
                console.warn('Invalid settings response:', typeof response)
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
            toast('Không thể tải cài đặt', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast('Vui lòng chọn file ảnh hợp lệ', 'error')
            return
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            toast('File phải nhỏ hơn 2MB', 'error')
            return
        }

        setSelectedFile(file)

        // Preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleUploadQR = async () => {
        if (!selectedFile) {
            toast('Vui lòng chọn file trước', 'error')
            return
        }

        try {
            setUploading(true)
            const formData = new FormData()
            formData.append('qr_code', selectedFile)

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
            const response = await fetch(`${apiUrl}/team/settings/qr-code/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Tải lên thất bại')
            }

            const data = await response.json()
            setSettings(prev => ({ ...prev, qr_code_url: data.qr_code_url }))
            setSelectedFile(null)
            toast('Đã tải lên mã QR thành công', 'success')

            // Reload settings to ensure consistency
            await loadSettings()
        } catch (error) {
            console.error('Upload error:', error)
            toast(error instanceof Error ? error.message : 'Không thể tải lên mã QR', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteQR = async () => {
        if (!confirm('Bạn có chắc muốn xóa mã QR không?')) return

        try {
            setLoading(true)
            const response = await request<any>('/team/settings/qr-code', 'DELETE')

            if (response?.message) {
                setSettings(prev => ({ ...prev, qr_code_url: undefined }))
                setPreviewUrl(null)
                setSelectedFile(null)
                toast('Đã xóa mã QR', 'success')
            }
        } catch (error) {
            console.error('Delete error:', error)
            toast('Không thể xóa mã QR', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveBankInfo = async () => {
        try {
            setLoading(true)
            await request<any>('/team/settings', 'PUT', {
                fund: {
                    bank_account_number: bankAccount || null,
                    bank_name: bankName || null
                }
            })

            setSettings(prev => ({
                ...prev,
                bank_account_number: bankAccount,
                bank_name: bankName
            }))
            toast('Đã lưu thông tin ngân hàng', 'success')
        } catch (error) {
            console.error('Save error:', error)
            toast('Không thể lưu thông tin ngân hàng', 'error')
        } finally {
            setLoading(false)
        }
    }

    if (loading && !settings.qr_code_url) {
        return <div className="card pad" style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Đang tải cài đặt thanh toán...</div>
    }

    const editable = isOwner && !readOnly
    const isConfigured = !!(settings.bank_account_number && settings.bank_name && settings.qr_code_url)

    return (
        <div className="card pad">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--brand-050)', color: 'var(--brand-600)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <Bank size={19} weight="bold" />
                    </div>
                    <div className="sec-title" style={{ fontSize: 16 }}>Cài đặt thanh toán</div>
                </div>
                <span className={`chip ${isConfigured ? 'ok' : 'soft'}`} style={isConfigured ? { background: 'var(--brand-050)', color: 'var(--brand-700)' } : undefined}>
                    {isConfigured ? <><CheckCircle size={13} weight="bold" style={{ marginRight: 4, verticalAlign: -1 }} />Đã cấu hình</> : 'Chưa cấu hình'}
                </span>
            </div>

            <div className="dgrid" style={{ gap: 24 }}>
                {/* Bank information */}
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                        Thông tin ngân hàng
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
                            Tên ngân hàng
                        </label>
                        <input
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="VD: Vietcombank, Techcombank..."
                            disabled={!editable}
                            className={inputClass}
                            style={fieldStyle(editable)}
                        />
                    </div>

                    <div style={{ marginBottom: editable ? 16 : 0 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
                            Số tài khoản
                        </label>
                        <input
                            type="text"
                            value={bankAccount}
                            onChange={(e) => setBankAccount(e.target.value)}
                            placeholder="VD: 1234567890"
                            disabled={!editable}
                            className={inputClass}
                            style={fieldStyle(editable)}
                        />
                    </div>

                    {editable && (
                        <button className="btn btn-primary btn-sm" onClick={handleSaveBankInfo} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
                            {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                        </button>
                    )}
                </div>

                {/* QR code */}
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                        Mã QR thanh toán
                    </div>

                    {previewUrl ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-block', border: '1px solid var(--line)', borderRadius: 16, padding: 10, background: 'var(--surface-2)' }}>
                                <img
                                    src={previewUrl}
                                    alt="QR Code"
                                    style={{ maxWidth: 168, maxHeight: 168, display: 'block', borderRadius: 8 }}
                                />
                            </div>
                            {editable && (
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                                        <UploadSimple size={14} weight="bold" style={{ marginRight: 6, verticalAlign: -2 }} />Đổi ảnh
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={handleDeleteQR} disabled={loading} style={{ color: 'var(--danger)' }}>
                                        <Trash size={14} weight="bold" style={{ marginRight: 6, verticalAlign: -2 }} />Xóa
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        editable && (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: '1.5px dashed var(--line)', borderRadius: 16, padding: '28px 16px',
                                    textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)',
                                }}
                            >
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', margin: '0 auto 10px', color: 'var(--ink-3)' }}>
                                    <QrCode size={20} />
                                </div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>Chạm để tải ảnh QR lên</p>
                                <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--ink-3)' }}>PNG, JPG · tối đa 2MB</p>
                            </div>
                        )
                    )}

                    {!editable && !previewUrl && (
                        <div className="empty" style={{ padding: '20px 12px' }}>
                            <div className="e-ic"><QrCode size={22} /></div>
                            Chưa có mã QR thanh toán
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                    />

                    {selectedFile && (
                        <button className="btn btn-primary btn-block btn-sm" onClick={handleUploadQR} disabled={uploading} style={{ marginTop: 12, opacity: uploading ? 0.6 : 1 }}>
                            {uploading ? 'Đang tải lên...' : `Tải lên: ${selectedFile.name}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
