'use client'

import React, { useState } from 'react'
import { Card } from '@/components/Common/Card'
import { Badge } from '@/components/Common/Badge'
import { Button } from '@/components/Common/Button'
import { CaretRight, Bell, Eye, Users, Palette, Globe } from 'phosphor-react'
import Link from 'next/link'

interface SettingItemProps {
  label: string
  description?: string
  icon?: React.ReactNode
  value?: string
  onClick?: () => void
  className?: string
}

const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  icon,
  value,
  onClick,
  className = '',
}) => (
  <button
    onClick={onClick}
    className={`w-full px-lg py-lg border-b border-light-gray hover:bg-bone transition-colors flex items-center justify-between ${className}`}
  >
    <div className="flex items-center gap-lg flex-1 text-left">
      {icon && <span className="text-gray flex-shrink-0">{icon}</span>}
      <div className="flex-1">
        <p className="text-body font-medium text-black">{label}</p>
        {description && <p className="text-caption text-gray mt-xs">{description}</p>}
      </div>
    </div>
    {value ? (
      <span className="text-small text-gray ml-md flex-shrink-0">{value}</span>
    ) : (
      <CaretRight size={20} className="text-gray flex-shrink-0" />
    )}
  </button>
)

interface ToggleItemProps {
  label: string
  description?: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  icon?: React.ReactNode
}

const ToggleItem: React.FC<ToggleItemProps> = ({
  label,
  description,
  enabled,
  onChange,
  icon,
}) => (
  <div className="w-full px-lg py-lg border-b border-light-gray hover:bg-bone transition-colors flex items-center justify-between">
    <div className="flex items-center gap-lg flex-1">
      {icon && <span className="text-gray flex-shrink-0">{icon}</span>}
      <div className="flex-1">
        <p className="text-body font-medium text-black">{label}</p>
        {description && <p className="text-caption text-gray mt-xs">{description}</p>}
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-light-gray peer-checked:bg-black rounded-full peer transition-colors" />
      <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full peer-checked:translate-x-5 transition-transform" />
    </label>
  </div>
)

interface DropdownItemProps {
  label: string
  description?: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  icon?: React.ReactNode
}

const DropdownItem: React.FC<DropdownItemProps> = ({
  label,
  description,
  value,
  options,
  onChange,
  icon,
}) => (
  <div className="w-full px-lg py-lg border-b border-light-gray hover:bg-bone transition-colors flex items-center justify-between">
    <div className="flex items-center gap-lg flex-1">
      {icon && <span className="text-gray flex-shrink-0">{icon}</span>}
      <div className="flex-1">
        <p className="text-body font-medium text-black">{label}</p>
        {description && <p className="text-caption text-gray mt-xs">{description}</p>}
      </div>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-md py-sm border border-light-gray rounded-card text-small bg-white text-black hover:border-gray transition-colors cursor-pointer ml-md flex-shrink-0"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
)

export default function MenuPage() {
  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [notificationFreq, setNotificationFreq] = useState('immediate')

  // Preferences
  const [darkMode, setDarkMode] = useState(false)
  const [language, setLanguage] = useState('en')

  // Mock user data
  const user = {
    name: 'Nguyễn Văn A',
    email: 'user@example.com',
    role: 'Manager' as const,
    avatar: undefined,
    team: 'FC Team',
  }

  return (
    <main className="pb-24 md:pb-xl">
      {/* Header */}
      <div className="px-lg md:px-2xl pt-2xl md:pt-3xl mb-2xl border-b border-light-gray">
        <h1 className="text-section-title font-bold text-black mb-md">Menu</h1>
        <p className="text-body text-gray mb-2xl">Cài đặt & tùy chỉnh đội</p>
      </div>

      <div className="max-w-2xl mx-auto px-lg md:px-2xl">
        {/* User Info Card */}
        <Card className="mb-2xl">
          <div className="flex flex-col items-center text-center">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover mb-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-bone flex items-center justify-center mb-lg">
                <span className="text-hero font-bold text-black">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h2 className="text-heading-3 font-bold text-black mb-md">{user.name}</h2>
            <Badge variant="info" className="mb-lg">
              {user.role}
            </Badge>
            <p className="text-small text-gray">{user.email}</p>
          </div>
        </Card>

        {/* Account Settings Group */}
        <div className="mb-2xl">
          <h3 className="text-caption font-bold text-gray px-lg mb-md">TÀI KHOẢN</h3>
          <Card className="p-0 overflow-hidden">
            <SettingItem label="Cài đặt hồ sơ" description="Chỉnh sửa thông tin hồ sơ" />
            <SettingItem label="Đổi mật khẩu" description="Cập nhật mật khẩu" />
            <SettingItem label="Cài đặt riêng tư" description="Quản lý tùy chọn riêng tư" />
          </Card>
        </div>

        {/* Notification Settings Group */}
        <div className="mb-2xl">
          <h3 className="text-caption font-bold text-gray px-lg mb-md">THÔNG BÁO</h3>
          <Card className="p-0 overflow-hidden">
            <ToggleItem
              label="Thông báo đẩy"
              description="Nhận cảnh báo đẩy"
              enabled={pushEnabled}
              onChange={setPushEnabled}
              icon={<Bell size={20} weight="bold" />}
            />
            <ToggleItem
              label="Thông báo email"
              description="Nhận cập nhật qua email"
              enabled={emailEnabled}
              onChange={setEmailEnabled}
              icon={<Bell size={20} weight="bold" />}
            />
            <ToggleItem
              label="Cảnh báo SMS"
              description="Nhận thông báo SMS"
              enabled={smsEnabled}
              onChange={setSmsEnabled}
              icon={<Bell size={20} weight="bold" />}
            />
            <DropdownItem
              label="Tần suất thông báo"
              value={notificationFreq}
              onChange={setNotificationFreq}
              options={[
                { value: 'immediate', label: 'Ngay lập tức' },
                { value: 'daily', label: 'Hàng ngày' },
                { value: 'weekly', label: 'Hàng tuần' },
              ]}
              icon={<Bell size={20} weight="bold" />}
            />
          </Card>
        </div>

        {/* Team Settings Group */}
        <div className="mb-2xl">
          <h3 className="text-caption font-bold text-gray px-lg mb-md">ĐỘI</h3>
          <Card className="p-0 overflow-hidden">
            <SettingItem
              label="Đội hiện tại"
              value={user.team}
              icon={<Users size={20} weight="bold" />}
            />
            <SettingItem
              label="Chuyển đến đội khác"
              description="Chuyển sang đội khác"
              icon={<Users size={20} weight="bold" />}
            />
            <SettingItem
              label="Thành viên đội"
              description="Xem thông tin đội"
              icon={<Users size={20} weight="bold" />}
            />
            <SettingItem
              label="Rời khỏi đội"
              description="Xóa bản thân khỏi đội"
              icon={<Users size={20} weight="bold" />}
              className="!text-red-600"
            />
          </Card>
        </div>

        {/* App Settings Group */}
        <div className="mb-2xl">
          <h3 className="text-caption font-bold text-gray px-lg mb-md">ỨNG DỤNG</h3>
          <Card className="p-0 overflow-hidden">
            <ToggleItem
              label="Chế độ tối"
              description="Bật chủ đề tối (tùy chọn)"
              enabled={darkMode}
              onChange={setDarkMode}
              icon={<Palette size={20} weight="bold" />}
            />
            <DropdownItem
              label="Ngôn ngữ"
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'en', label: 'English' },
                { value: 'vi', label: 'Tiếng Việt' },
              ]}
              icon={<Globe size={20} weight="bold" />}
            />
            <SettingItem
              label="Phiên bản"
              value="1.0.0"
              icon={<Eye size={20} weight="bold" />}
            />
            <SettingItem
              label="Kiểm tra cập nhật"
              description="Cập nhật lên phiên bản mới nhất"
              icon={<Eye size={20} weight="bold" />}
            />
          </Card>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-md mb-2xl">
          <Button variant="secondary" size="lg" className="w-full !text-red-600">
            Đăng xuất
          </Button>

          <div className="flex gap-lg justify-center text-small text-gray">
            <Link href="/about" className="hover:text-black transition-colors">
              Về & Trợ giúp
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-black transition-colors">
              Chính sách bảo mật
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
