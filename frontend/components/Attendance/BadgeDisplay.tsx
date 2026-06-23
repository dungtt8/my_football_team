'use client'

import React, { useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'
import { Badge } from '@/hooks/useAttendance'

interface BadgeDisplayProps {
  badges: Badge[]
  maxVisible?: number
  showAll?: boolean
  isLoading?: boolean
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badges,
  maxVisible = 6,
  showAll: initialShowAll = false,
  isLoading = false,
}) => {
  const [showAll, setShowAll] = useState(initialShowAll)
  const visibleBadges = showAll ? badges : badges.slice(0, maxVisible)
  const hasMore = badges.length > maxVisible

  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: SPACING.md,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              height: '80px',
              backgroundColor: COLORS.bone,
              borderRadius: '8px',
              animation: 'pulse 2s infinite',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: SPACING.md,
          marginBottom: hasMore && !showAll ? '12px' : 0,
        }}
      >
        {visibleBadges.map((badge) => (
          <div
            key={badge.id}
            style={{
              textAlign: 'center',
              padding: '8px',
              border: `1px solid ${COLORS.lightGray}`,
              borderRadius: '8px',
              backgroundColor: badge.isEarned ? COLORS.bone : COLORS.white,
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: badge.isEarned ? 1 : 0.5,
              filter: badge.isEarned ? 'none' : 'grayscale(100%)',
            }}
            title={badge.description}
          >
            <div
              style={{
                fontSize: '32px',
                marginBottom: '4px',
              }}
            >
              {badge.icon}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: TYPOGRAPHY.sizes.caption,
                fontWeight: TYPOGRAPHY.weights.medium,
                color: COLORS.black,
              }}
            >
              {badge.name}
            </p>
            {badge.earnedDate && (
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '10px',
                  color: COLORS.gray,
                }}
              >
                {new Date(badge.earnedDate).toLocaleDateString('vi-VN')}
              </p>
            )}
          </div>
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            color: COLORS.black,
            border: `1px solid ${COLORS.lightGray}`,
            borderRadius: '4px',
            fontSize: TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.medium,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          View All Badges ({badges.length})
        </button>
      )}
    </div>
  )
}
