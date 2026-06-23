'use client'

import React from 'react'
import { Card } from '../Common/Card'
import { Badge } from '../Common/Badge'
import { Button } from '../Common/Button'
import { PencilSimple, SignOut } from 'phosphor-react'

interface UserData {
  name: string
  email: string
  avatar?: string
  role: string
  team?: string
  joinDate?: string
}

interface ProfileCardProps {
  user: UserData
  showActions?: boolean
  onEdit?: () => void
  onLogout?: () => void
  compact?: boolean
  className?: string
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  user,
  showActions = false,
  onEdit,
  onLogout,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <Card className={`flex items-center gap-lg ${className}`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-taupe/10 flex items-center justify-center">
              <span className="text-body font-bold text-espresso">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-body font-bold text-espresso truncate">{user.name}</h3>
          <p className="text-caption text-taupe truncate">{user.email}</p>
          {user.role && (
            <Badge variant="info" className="mt-xs inline-block">
              {user.role}
            </Badge>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-md flex-shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-md text-taupe hover:text-espresso transition-colors duration-300 ease-smooth"
                aria-label="Edit profile"
              >
                <PencilSimple size={20} weight="bold" />
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-md text-taupe hover:text-espresso transition-colors duration-300 ease-smooth"
                aria-label="Logout"
              >
                <SignOut size={20} weight="bold" />
              </button>
            )}
          </div>
        )}
      </Card>
    )
  }

  // Full View
  return (
    <Card className={className}>
      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-2xl">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-24 h-24 rounded-2xl object-cover mb-2xl shadow-soft"
          />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-taupe/10 flex items-center justify-center mb-2xl shadow-soft">
            <span className="text-hero font-bold text-espresso">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Name */}
        <h2 className="text-heading-1 font-serif text-espresso text-center mb-lg">
          {user.name}
        </h2>

        {/* Role Badge */}
        <Badge variant="info" className="mb-2xl">
          {user.role}
        </Badge>

        {/* Email */}
        <p className="text-body text-taupe text-center mb-2xl">{user.email}</p>

        {/* Additional Info */}
        {(user.team || user.joinDate) && (
          <div className="text-caption text-taupe/70 space-y-xs text-center">
            {user.team && <p>Team: {user.team}</p>}
            {user.joinDate && <p>Joined: {user.joinDate}</p>}
          </div>
        )}
      </div>

      {/* Divider */}
      {showActions && <div className="my-2xl border-t border-espresso/5" />}

      {/* Action Buttons */}
      {showActions && (
        <div className="grid grid-cols-2 gap-md">
          <Button
            variant="primary"
            size="md"
            onClick={onEdit}
            className="flex items-center justify-center gap-sm"
          >
            <PencilSimple size={18} weight="bold" />
            Edit
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={onLogout}
            className="flex items-center justify-center gap-sm !text-red-600"
          >
            <SignOut size={18} weight="bold" />
            Logout
          </Button>
        </div>
      )}
    </Card>
  )
}
