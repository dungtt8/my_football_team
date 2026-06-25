# Personal Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a personal settings page allowing users to view and edit their profile (name, phone, jersey number) and change password.

**Architecture:** 
- Backend: 2 new REST endpoints (profile update, password change) using existing auth + error handling patterns
- Frontend: 1 new hook (`useProfile`) + 1 settings page + 1 password modal component
- All API calls use bearer token auth, validation on both layers

**Tech Stack:** Express (backend), React hooks + TypeScript (frontend), Knex migrations not needed (using existing tables)

---

## File Structure

```
Backend:
  - Modify: src/handlers/teamHandler.js → add updateProfile endpoint (existing pattern)
  - Modify: src/app.js → register 2 new routes
  - Modify: src/services/authService.js → add password hashing/comparison utilities if needed

Frontend:
  - Create: frontend/hooks/useProfile.ts → profile API hook
  - Create: frontend/app/app/menu/settings/page.tsx → settings page
  - Create: frontend/components/Common/PasswordChangeModal.tsx → password modal
  - Modify: frontend/app/app/menu/page.tsx → add settings link + navigation
  - Modify: frontend/app/app/layout.tsx → no changes (menu already in nav bar)
```

---

## BACKEND IMPLEMENTATION

### Task 1: Create Password Update Endpoint

**Files:**
- Modify: `backend/src/handlers/teamHandler.js`

- [ ] **Step 1: Add password comparison helper at top of file**

After the `isPaymentDeadlineActive` function (~line 15), add bcrypt password validation. First, check if bcrypt is already imported at the top, if not add:

```javascript
const bcrypt = require('bcryptjs');
```

Then add a helper function in teamHandler.js (after isPaymentDeadlineActive):

```javascript
/**
 * Verify password against hash
 * Handles both bcrypt hashes and plain text (for legacy/testing)
 */
const verifyPassword = async (plainPassword, hash) => {
    try {
        // Try bcrypt first (modern)
        return await bcrypt.compare(plainPassword, hash);
    } catch (e) {
        // Fallback: plain text comparison (for testing/legacy)
        return plainPassword === hash;
    }
};

/**
 * Hash password with bcrypt
 */
const hashPassword = async (plainPassword) => {
    return await bcrypt.hash(plainPassword, 10);
};
```

- [ ] **Step 2: Add updateProfile endpoint**

Add this function before the module.exports at line ~820:

```javascript
/**
 * PUT /api/profile
 * Update user profile (name, phone)
 * Body: { full_name?, phone? }
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { full_name, phone } = req.body;

        // Validate inputs
        if (full_name !== undefined && (!full_name || !full_name.trim())) {
            throw new ValidationError('Full name cannot be empty');
        }
        if (phone !== undefined && phone && !/^[\d\s\-\+\(\)]+$/.test(phone)) {
            throw new ValidationError('Invalid phone format');
        }

        // Build update object
        const updateData = {};
        if (full_name !== undefined) updateData.full_name = full_name.trim();
        if (phone !== undefined) updateData.phone = phone || null;

        // Update user
        const [updated] = await db('users')
            .where('id', userId)
            .update({ ...updateData, updated_at: new Date() })
            .returning('*');

        logger.info('Profile updated', { user_id: userId });

        return res.json({
            id: updated.id,
            email: updated.email,
            full_name: updated.full_name,
            phone: updated.phone,
        });
    } catch (error) {
        return handleError(error, req, res, {
            endpoint: 'PUT /api/profile',
            method: 'PUT'
        });
    }
};
```

- [ ] **Step 3: Add changePassword endpoint**

Add this function before module.exports:

```javascript
/**
 * PUT /api/auth/password
 * Change user password
 * Body: { current_password, new_password, new_password_confirm }
 */
const changePassword = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { current_password, new_password, new_password_confirm } = req.body;

        // Validate inputs
        if (!current_password) throw new ValidationError('Current password is required');
        if (!new_password) throw new ValidationError('New password is required');
        if (!new_password_confirm) throw new ValidationError('Password confirmation is required');
        if (new_password !== new_password_confirm) {
            throw new ValidationError('New passwords do not match');
        }
        if (new_password.length < 6) {
            throw new ValidationError('New password must be at least 6 characters');
        }
        if (new_password === current_password) {
            throw new ValidationError('New password must be different from current password');
        }

        // Get user
        const user = await db('users').where('id', userId).first();
        if (!user) throw new NotFoundError('User not found');

        // Verify current password
        const isPasswordValid = await verifyPassword(current_password, user.password_hash || '');
        if (!isPasswordValid) {
            throw new ValidationError('Current password is incorrect');
        }

        // Hash and update new password
        const hashedPassword = await hashPassword(new_password);
        await db('users')
            .where('id', userId)
            .update({ password_hash: hashedPassword, updated_at: new Date() });

        logger.info('Password changed', { user_id: userId });

        return res.json({ message: 'Password changed successfully' });
    } catch (error) {
        return handleError(error, req, res, {
            endpoint: 'PUT /api/auth/password',
            method: 'PUT'
        });
    }
};
```

- [ ] **Step 4: Update module.exports to include new functions**

Find the module.exports line (~821) and add the new exports:

```javascript
module.exports = { 
    createTeam, 
    joinTeam, 
    getInviteCode, 
    regenerateInviteCode, 
    listMembers, 
    updateMemberRole, 
    getSettings, 
    updateSettings, 
    uploadQRCode, 
    deleteQRCode, 
    deactivateMember, 
    kickMember, 
    updateJerseyNumber,
    updateProfile,
    changePassword
};
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/handlers/teamHandler.js
git commit -m "feat: add updateProfile and changePassword handlers"
```

---

### Task 2: Register New Backend Routes

**Files:**
- Modify: `backend/src/app.js`

- [ ] **Step 1: Add profile route after auth middleware**

Find line ~76 where `app.use(authMiddleware);` is, then add the profile routes before tenancy middleware:

```javascript
// Profile & account management (auth required, NOT tenancy-scoped)
app.put('/api/profile', authMiddleware, teamHandler.updateProfile);
app.put('/api/auth/password', authMiddleware, teamHandler.changePassword);
```

These must be BEFORE the tenancy middleware (~line 85) since they don't need team context.

- [ ] **Step 2: Verify placement**

Ensure these routes are placed between `app.use(authMiddleware);` and the tenancy middleware comment. Should look like:

```javascript
// Protected routes (require auth, but NOT yet tenancy)
app.use(authMiddleware);

// Profile & account management (auth required, NOT tenancy-scoped)
app.put('/api/profile', authMiddleware, teamHandler.updateProfile);
app.put('/api/auth/password', authMiddleware, teamHandler.changePassword);

// Team onboarding — auth required but no team context yet
app.post('/api/teams', teamHandler.createTeam);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.js
git commit -m "feat: register profile and password change routes"
```

---

## FRONTEND IMPLEMENTATION

### Task 3: Create useProfile Hook

**Files:**
- Create: `frontend/hooks/useProfile.ts`

- [ ] **Step 1: Create the hook file**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export interface UserProfile {
    id: string
    email: string
    full_name: string
    phone?: string
}

export interface UseProfileReturn {
    profile: UserProfile | null
    loading: boolean
    error: Error | null
    updateProfile: (data: { full_name?: string; phone?: string }) => Promise<UserProfile>
    changePassword: (data: {
        current_password: string
        new_password: string
        new_password_confirm: string
    }) => Promise<{ message: string }>
}

export const useProfile = (): UseProfileReturn => {
    const { request, loading, error } = useApi()
    const [localError, setLocalError] = useState<Error | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)

    const updateProfile = useCallback(
        async (data: { full_name?: string; phone?: string }) => {
            try {
                setLocalError(null)
                const result = await request<UserProfile>('/profile', 'PUT', data)
                if (result) {
                    setProfile(result)
                }
                return result
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to update profile')
                setLocalError(e)
                throw e
            }
        },
        [request]
    )

    const changePassword = useCallback(
        async (data: {
            current_password: string
            new_password: string
            new_password_confirm: string
        }) => {
            try {
                setLocalError(null)
                return await request<{ message: string }>('/auth/password', 'PUT', data)
            } catch (err) {
                const e = err instanceof Error ? err : new Error('Failed to change password')
                setLocalError(e)
                throw e
            }
        },
        [request]
    )

    return {
        profile,
        loading,
        error: error || localError,
        updateProfile,
        changePassword,
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/hooks/useProfile.ts
git commit -m "feat: add useProfile hook for profile API calls"
```

---

### Task 4: Create Password Change Modal Component

**Files:**
- Create: `frontend/components/Common/PasswordChangeModal.tsx`

- [ ] **Step 1: Create password modal**

```typescript
'use client'

import React, { useState } from 'react'

const G = {
    glass: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F',
    t1: '#F0F4FF',
    t2: 'rgba(240,244,255,0.55)',
    t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B',
}

interface PasswordChangeModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: {
        current_password: string
        new_password: string
        new_password_confirm: string
    }) => Promise<void>
    isLoading?: boolean
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false,
}) => {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Frontend validation
        if (!currentPassword) {
            setError('Nhập mật khẩu hiện tại')
            return
        }
        if (!newPassword || newPassword.length < 6) {
            setError('Mật khẩu mới phải có ít nhất 6 ký tự')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp')
            return
        }
        if (currentPassword === newPassword) {
            setError('Mật khẩu mới phải khác mật khẩu hiện tại')
            return
        }

        try {
            await onSubmit({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirm: confirmPassword,
            })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999,
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: '#1A1F2E',
                    border: `1px solid ${G.glassBorder}`,
                    borderRadius: '16px',
                    padding: '24px',
                    width: 'min(90%, 400px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 1000,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
            >
                <h2
                    style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: G.t1,
                        margin: '0 0 20px 0',
                    }}
                >
                    Đổi mật khẩu
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Current Password */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: G.t2,
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Mật khẩu hiện tại
                        </label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: G.glass,
                                border: `1px solid ${G.glassBorder}`,
                                borderRadius: '10px',
                                color: G.t1,
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    {/* New Password */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: G.t2,
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Mật khẩu mới
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: G.glass,
                                border: `1px solid ${G.glassBorder}`,
                                borderRadius: '10px',
                                color: G.t1,
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: G.t2,
                                marginBottom: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Xác nhận mật khẩu
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: G.glass,
                                border: `1px solid ${G.glassBorder}`,
                                borderRadius: '10px',
                                color: G.t1,
                                fontSize: '14px',
                                boxSizing: 'border-box',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div
                            style={{
                                padding: '12px',
                                background: 'rgba(255,107,107,0.15)',
                                border: `1px solid rgba(255,107,107,0.30)`,
                                borderRadius: '8px',
                                color: '#FF9999',
                                fontSize: '13px',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'transparent',
                                border: `1px solid ${G.glassBorder}`,
                                borderRadius: '10px',
                                color: G.t2,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'rgba(0,214,143,0.20)',
                                border: `1px solid ${G.accent}`,
                                borderRadius: '10px',
                                color: G.accent,
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            {isLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/Common/PasswordChangeModal.tsx
git commit -m "feat: add password change modal component"
```

---

### Task 5: Create Settings Page

**Files:**
- Create: `frontend/app/app/menu/settings/page.tsx`

- [ ] **Step 1: Create settings page**

```typescript
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/useToast'
import { useApi } from '@/hooks/useApi'
import { PasswordChangeModal } from '@/components/Common/PasswordChangeModal'
import { ArrowLeft } from 'phosphor-react'

const G = {
    bg: '#070B14',
    glass: 'rgba(255,255,255,0.07)',
    glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F',
    accentDim: 'rgba(0,214,143,0.12)',
    t1: '#F0F4FF',
    t2: 'rgba(240,244,255,0.55)',
    t3: 'rgba(240,244,255,0.30)',
    red: '#FF6B6B',
}

export default function SettingsPage() {
    const router = useRouter()
    const { user, team, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { updateProfile, changePassword } = useProfile()
    const { request: apiRequest } = useApi()

    const [fullName, setFullName] = useState('')
    const [phone, setPhone] = useState('')
    const [jerseyNumber, setJerseyNumber] = useState('')

    const [editingField, setEditingField] = useState<string | null>(null)
    const [savingField, setSavingField] = useState<string | null>(null)
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [changePasswordLoading, setChangePasswordLoading] = useState(false)

    // Load user data
    useEffect(() => {
        if (authLoading || !user) return
        setFullName((user as any)?.full_name || user?.name || '')
        setPhone((user as any)?.phone || '')
    }, [user, authLoading])

    const handleProfileFieldSave = async (field: string, value: string) => {
        if (!value || value.trim() === '') {
            toast('Giá trị không được bỏ trống', 'error')
            return
        }

        setSavingField(field)
        try {
            await updateProfile({
                ...(field === 'fullName' && { full_name: value }),
                ...(field === 'phone' && { phone: value }),
            })
            toast('Đã lưu thành công', 'success')
            setEditingField(null)
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Lỗi lưu dữ liệu', 'error')
        } finally {
            setSavingField(null)
        }
    }

    const handleJerseyNumberSave = async () => {
        if (!team?.id) return

        const jerseyNum = jerseyNumber ? parseInt(jerseyNumber, 10) : null

        if (jerseyNum !== null && (jerseyNum <= 0 || !Number.isInteger(jerseyNum))) {
            toast('Số áo phải là số nguyên dương', 'error')
            return
        }

        setSavingField('jersey')
        try {
            await apiRequest('/members/jersey-number', 'PUT', {
                team_id: team.id,
                jersey_number: jerseyNum,
            })
            toast('Đã lưu số áo', 'success')
            setEditingField(null)
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Lỗi lưu số áo', 'error')
        } finally {
            setSavingField(null)
        }
    }

    const handlePasswordChange = async (data: {
        current_password: string
        new_password: string
        new_password_confirm: string
    }) => {
        setChangePasswordLoading(true)
        try {
            await changePassword(data)
            toast('Đã đổi mật khẩu thành công', 'success')
        } catch (err) {
            throw err
        } finally {
            setChangePasswordLoading(false)
        }
    }

    if (authLoading) {
        return <div style={{ color: G.t1, padding: '24px' }}>Đang tải...</div>
    }

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: G.accent,
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0, color: G.t1 }}>Cài đặt cá nhân</h1>
            </div>

            {/* Profile Section */}
            <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: G.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                    Thông tin cơ bản
                </p>

                {/* Full Name */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', color: G.t2, fontWeight: 500 }}>Họ và tên</label>
                        {editingField !== 'fullName' && (
                            <button
                                onClick={() => setEditingField('fullName')}
                                style={{ background: 'none', border: 'none', color: G.accent, cursor: 'pointer', fontSize: '12px' }}
                            >
                                Sửa
                            </button>
                        )}
                    </div>
                    {editingField === 'fullName' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: G.glass,
                                    border: `1px solid ${G.accent}`,
                                    borderRadius: '8px',
                                    color: G.t1,
                                    fontSize: '14px',
                                }}
                            />
                            <button
                                onClick={() => handleProfileFieldSave('fullName', fullName)}
                                disabled={savingField === 'fullName'}
                                style={{
                                    padding: '10px 16px',
                                    background: 'rgba(0,214,143,0.20)',
                                    border: `1px solid ${G.accent}`,
                                    borderRadius: '8px',
                                    color: G.accent,
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: savingField === 'fullName' ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {savingField === 'fullName' ? 'Lưu...' : 'Lưu'}
                            </button>
                        </div>
                    ) : (
                        <p style={{ margin: 0, padding: '10px 12px', background: G.glass, borderRadius: '8px', color: G.t1, fontSize: '14px' }}>
                            {fullName || 'Chưa cập nhật'}
                        </p>
                    )}
                </div>

                {/* Email (read-only) */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', color: G.t2, fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                        Email (không thể đổi)
                    </label>
                    <p
                        style={{
                            margin: 0,
                            padding: '10px 12px',
                            background: G.glass,
                            borderRadius: '8px',
                            color: G.t3,
                            fontSize: '14px',
                            opacity: 0.6,
                        }}
                    >
                        {user?.email || '---'}
                    </p>
                </div>

                {/* Phone */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', color: G.t2, fontWeight: 500 }}>Số điện thoại</label>
                        {editingField !== 'phone' && (
                            <button
                                onClick={() => setEditingField('phone')}
                                style={{ background: 'none', border: 'none', color: G.accent, cursor: 'pointer', fontSize: '12px' }}
                            >
                                Sửa
                            </button>
                        )}
                    </div>
                    {editingField === 'phone' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    background: G.glass,
                                    border: `1px solid ${G.accent}`,
                                    borderRadius: '8px',
                                    color: G.t1,
                                    fontSize: '14px',
                                }}
                                placeholder="+84..."
                            />
                            <button
                                onClick={() => handleProfileFieldSave('phone', phone)}
                                disabled={savingField === 'phone'}
                                style={{
                                    padding: '10px 16px',
                                    background: 'rgba(0,214,143,0.20)',
                                    border: `1px solid ${G.accent}`,
                                    borderRadius: '8px',
                                    color: G.accent,
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: savingField === 'phone' ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {savingField === 'phone' ? 'Lưu...' : 'Lưu'}
                            </button>
                        </div>
                    ) : (
                        <p style={{ margin: 0, padding: '10px 12px', background: G.glass, borderRadius: '8px', color: G.t1, fontSize: '14px' }}>
                            {phone || 'Chưa cập nhật'}
                        </p>
                    )}
                </div>
            </div>

            {/* Team Info Section */}
            {team && (
                <div style={{ marginBottom: '32px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: G.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                        Thông tin đội
                    </p>

                    {/* Jersey Number */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', color: G.t2, fontWeight: 500 }}>Số áo</label>
                            {editingField !== 'jersey' && (
                                <button
                                    onClick={() => setEditingField('jersey')}
                                    style={{ background: 'none', border: 'none', color: G.accent, cursor: 'pointer', fontSize: '12px' }}
                                >
                                    Sửa
                                </button>
                            )}
                        </div>
                        {editingField === 'jersey' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    value={jerseyNumber}
                                    onChange={(e) => setJerseyNumber(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 12px',
                                        background: G.glass,
                                        border: `1px solid ${G.accent}`,
                                        borderRadius: '8px',
                                        color: G.t1,
                                        fontSize: '14px',
                                    }}
                                    placeholder="Nhập số áo"
                                    min="1"
                                />
                                <button
                                    onClick={() => handleJerseyNumberSave()}
                                    disabled={savingField === 'jersey'}
                                    style={{
                                        padding: '10px 16px',
                                        background: 'rgba(0,214,143,0.20)',
                                        border: `1px solid ${G.accent}`,
                                        borderRadius: '8px',
                                        color: G.accent,
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: savingField === 'jersey' ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {savingField === 'jersey' ? 'Lưu...' : 'Lưu'}
                                </button>
                            </div>
                        ) : (
                            <p style={{ margin: 0, padding: '10px 12px', background: G.glass, borderRadius: '8px', color: G.t1, fontSize: '14px' }}>
                                {jerseyNumber || 'Chưa cập nhật'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Security Section */}
            <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: G.accent, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                    Bảo mật
                </p>

                <button
                    onClick={() => setPasswordModalOpen(true)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(0,214,143,0.12)',
                        border: `1px solid ${G.glassBorder}`,
                        borderRadius: '10px',
                        color: G.accent,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                    }}
                >
                    🔐 Đổi mật khẩu
                </button>
            </div>

            {/* Password Modal */}
            <PasswordChangeModal
                isOpen={passwordModalOpen}
                onClose={() => setPasswordModalOpen(false)}
                onSubmit={handlePasswordChange}
                isLoading={changePasswordLoading}
            />
        </div>
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/app/menu/settings/page.tsx
git commit -m "feat: add personal settings page with profile and password change"
```

---

### Task 6: Update Menu Page to Link to Settings

**Files:**
- Modify: `frontend/app/app/menu/page.tsx`

- [ ] **Step 1: Find and update the menu item**

Locate the line with `{ label: 'Thông tin cá nhân', icon: '👤', action: () => { } }` and update it:

```typescript
{ label: 'Thông tin cá nhân', icon: '👤', action: () => router.push('/app/menu/settings') },
```

- [ ] **Step 2: Verify the change**

The menu item should now navigate to the settings page instead of doing nothing.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/app/menu/page.tsx
git commit -m "feat: link personal info menu item to settings page"
```

---

## VERIFICATION & TESTING

### Task 7: Frontend Build Verification

- [ ] **Step 1: Run frontend build**

```bash
cd /Users/dung_tt/Desktop/Freelances/my_football_team/frontend
npm run build 2>&1 | tail -30
```

Expected: Build completes with 0 TypeScript errors. All routes including `/app/menu/settings` should be listed.

- [ ] **Step 2: Verify routes**

Look for:
```
├ ○ /app/menu
├ ○ /app/menu/settings
```

---

### Task 8: Manual Testing Checklist

- [ ] **Test profile update flow:**
  1. Navigate to Settings (`/app/menu` → click "Thông tin cá nhân")
  2. Click "Sửa" next to "Họ và tên"
  3. Change name and click "Lưu"
  4. Verify toast "Đã lưu thành công"
  5. Refresh page and verify name persists

- [ ] **Test phone update:**
  1. Click "Sửa" next to phone
  2. Enter phone number
  3. Click "Lưu"
  4. Verify success

- [ ] **Test jersey number update:**
  1. Click "Sửa" next to "Số áo"
  2. Enter valid number (1-99)
  3. Click "Lưu"
  4. Verify success

- [ ] **Test jersey validation:**
  1. Click "Sửa"
  2. Enter 0 or negative number
  3. Click "Lưu"
  4. Verify error: "Số áo phải là số nguyên dương"

- [ ] **Test password change:**
  1. Click "🔐 Đổi mật khẩu"
  2. Enter wrong current password
  3. Click "Đổi mật khẩu"
  4. Verify error: "Current password is incorrect"
  5. Enter correct current password + new passwords that don't match
  6. Verify error: "Mật khẩu xác nhận không khớp"
  7. Enter matching new passwords, confirm success

- [ ] **Test read-only email:**
  1. Verify email field is greyed out and not editable

---

## Deployment Notes

- Both backend endpoints require authentication (`authMiddleware`)
- Password endpoint requires valid current password verification
- All validation errors are handled by `handleError` utility
- Frontend uses `useApi` hook which automatically includes Bearer token
- No database schema changes needed (using existing `users` table)

---

## Rollback Plan

If issues arise:
1. Revert commits: `git revert <commit-hashes>`
2. Remove routes from `app.js`
3. Delete new files: `page.tsx`, `useProfile.ts`, `PasswordChangeModal.tsx`
4. Restore menu item placeholder

