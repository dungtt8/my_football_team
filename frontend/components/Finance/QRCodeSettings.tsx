'use client'

import React, { useState, useEffect } from 'react'
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

const inputClass = 'w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none'

export const QRCodeSettings: React.FC<QRCodeSettingsProps> = ({ isOwner, readOnly = false }) => {
    const { request } = useApi()
    const { isLoading: authLoading } = useAuth()
    const { toast } = useToast()

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

    return (
        <div className="card pad">
            <div className="sec-title" style={{ marginBottom: 16 }}>💳 Cài đặt thanh toán</div>

            {/* Bank Information */}
            <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>
                    Tên ngân hàng
                </label>
                <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="VD: Vietcombank, Techcombank..."
                    disabled={!editable}
                    className={inputClass}
                    style={{ borderColor: 'var(--line)', background: editable ? 'var(--surface-2)' : 'var(--surface-2)', color: 'var(--ink)', opacity: editable ? 1 : 0.7, cursor: editable ? 'text' : 'default' }}
                />
            </div>

            <div style={{ marginBottom: editable ? 14 : 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>
                    Số tài khoản
                </label>
                <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="VD: 1234567890"
                    disabled={!editable}
                    className={inputClass}
                    style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--ink)', opacity: editable ? 1 : 0.7, cursor: editable ? 'text' : 'default' }}
                />
            </div>

            {editable && (
                <button className="btn btn-primary btn-sm" onClick={handleSaveBankInfo} disabled={loading} style={{ marginBottom: 20, opacity: loading ? 0.6 : 1 }}>
                    {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
            )}

            {/* QR Code Upload */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>Mã QR thanh toán</div>

                {/* QR Code Preview */}
                {previewUrl && (
                    <div style={{ marginBottom: 12, textAlign: 'center' }}>
                        <img
                            src={previewUrl}
                            alt="QR Code"
                            style={{
                                maxWidth: 200,
                                maxHeight: 200,
                                border: '1px solid var(--line)',
                                borderRadius: 12,
                                padding: 8,
                                background: 'var(--surface-2)'
                            }}
                        />
                        {editable && (
                            <div style={{ marginTop: 10 }}>
                                <button className="btn btn-ghost btn-sm" onClick={handleDeleteQR} disabled={loading} style={{ color: 'var(--danger)', opacity: loading ? 0.6 : 1 }}>
                                    {loading ? 'Đang xóa...' : 'Xóa'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* File Upload Input */}
                {editable && (
                    <div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            style={{ display: 'block', marginBottom: 10, fontSize: 13, color: 'var(--ink-2)' }}
                        />
                        {selectedFile && (
                            <button className="btn btn-primary btn-sm" onClick={handleUploadQR} disabled={uploading} style={{ opacity: uploading ? 0.6 : 1 }}>
                                {uploading ? 'Đang tải lên...' : 'Tải lên'}
                            </button>
                        )}
                    </div>
                )}

                {!previewUrl && !editable && (
                    <p style={{ color: 'var(--ink-4)', fontSize: 12, margin: 0 }}>Chưa có mã QR thanh toán</p>
                )}
            </div>
        </div>
    )
}
