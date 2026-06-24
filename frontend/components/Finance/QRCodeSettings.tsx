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
            if (response?.fund) {
                setSettings(response.fund)
                setBankAccount(response.fund.bank_account_number || '')
                setBankName(response.fund.bank_name || '')
                if (response.fund.qr_code_url) {
                    setPreviewUrl(response.fund.qr_code_url)
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error)
            toast('Failed to load payment settings', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast('Please select a valid image file', 'error')
            return
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            toast('File size must be less than 2MB', 'error')
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
            toast('Please select a file first', 'error')
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
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Upload failed')
            }

            const data = await response.json()
            setSettings(prev => ({ ...prev, qr_code_url: data.qr_code_url }))
            setSelectedFile(null)
            toast('QR code uploaded successfully', 'success')

            // Reload settings to ensure consistency
            await loadSettings()
        } catch (error) {
            console.error('Upload error:', error)
            toast(error instanceof Error ? error.message : 'Failed to upload QR code', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteQR = async () => {
        if (!confirm('Are you sure you want to delete the QR code?')) return

        try {
            setLoading(true)
            const response = await request<any>('/team/settings/qr-code', 'DELETE')

            if (response?.message) {
                setSettings(prev => ({ ...prev, qr_code_url: undefined }))
                setPreviewUrl(null)
                toast('QR code deleted successfully', 'success')
            }
        } catch (error) {
            console.error('Delete error:', error)
            toast('Failed to delete QR code', 'error')
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
            toast('Bank information saved successfully', 'success')
        } catch (error) {
            console.error('Save error:', error)
            toast('Failed to save bank information', 'error')
        } finally {
            setLoading(false)
        }
    }

    if (loading && !settings.qr_code_url) {
        return <div style={{ padding: '12px', textAlign: 'center', color: '#999' }}>Loading payment settings...</div>
    }

    const editable = isOwner && !readOnly

    return (
        <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>💳 Cài đặt thanh toán</h3>

            {/* Bank Information */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#666' }}>
                    Tên ngân hàng
                </label>
                <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="VD: Vietcombank, Techcombank..."
                    disabled={!editable}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        opacity: editable ? 1 : 0.7,
                        cursor: editable ? 'text' : 'default'
                    }}
                />
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#666' }}>
                    Số tài khoản
                </label>
                <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="VD: 1234567890"
                    disabled={!editable}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        opacity: editable ? 1 : 0.7,
                        cursor: editable ? 'text' : 'default'
                    }}
                />
            </div>

            {editable && (
                <button
                    onClick={handleSaveBankInfo}
                    disabled={loading}
                    style={{
                        padding: '8px 16px',
                        background: '#1a1a1a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        marginBottom: '16px'
                    }}
                >
                    {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
            )}

            {/* QR Code Upload */}
            <div style={{ borderTop: '1px solid #ddd', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '500', color: '#333' }}>Mã QR thanh toán</h4>

                {/* QR Code Preview */}
                {previewUrl && (
                    <div style={{ marginBottom: '12px', textAlign: 'center' }}>
                        <img
                            src={previewUrl}
                            alt="QR Code"
                            style={{
                                maxWidth: '200px',
                                maxHeight: '200px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                padding: '8px',
                                background: 'white'
                            }}
                        />
                        {editable && (
                            <div style={{ marginTop: '8px' }}>
                                <button
                                    onClick={handleDeleteQR}
                                    disabled={loading}
                                    style={{
                                        padding: '6px 12px',
                                        background: '#ff4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.6 : 1
                                    }}
                                >
                                    {loading ? 'Đang xóa...' : 'Xóa'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* File Upload Input */}
                {editable && (
                    <div style={{ marginBottom: '12px' }}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '13px'
                            }}
                        />
                        {selectedFile && (
                            <button
                                onClick={handleUploadQR}
                                disabled={uploading}
                                style={{
                                    padding: '8px 16px',
                                    background: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    opacity: uploading ? 0.6 : 1
                                }}
                            >
                                {uploading ? 'Đang tải lên...' : 'Tải lên'}
                            </button>
                        )}
                    </div>
                )}

                {!previewUrl && !editable && (
                    <p style={{ color: '#999', fontSize: '12px', margin: '0' }}>Chưa có mã QR thanh toán</p>
                )}
            </div>
        </div>
    )
}
