'use client'

import React from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'

interface LevelProgressProps {
  currentLevel: number
  currentLevelName: string
  progressPercent: number
  totalLevels: number
  isLoading?: boolean
}

export const LevelProgress: React.FC<LevelProgressProps> = ({
  currentLevel,
  currentLevelName,
  progressPercent,
  totalLevels,
  isLoading = false,
}) => {
  const getLevelIcon = (level: number) => {
    if (level <= 1) return '⭐'
    if (level <= 3) return '🌟'
    if (level <= 5) return '💫'
    return '🌠'
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '24px',
          backgroundColor: COLORS.bone,
          borderRadius: '12px',
          animation: 'pulse 2s infinite',
          height: '200px',
        }}
      />
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        backgroundColor: COLORS.bone,
        borderRadius: '12px',
        border: `1px solid ${COLORS.lightGray}`,
      }}
    >
      {/* Level Badge */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: COLORS.white,
          border: `2px solid ${COLORS.black}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '32px' }}>{getLevelIcon(currentLevel)}</div>
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.semibold,
            color: COLORS.black,
          }}
        >
          Lvl {currentLevel}
        </p>
      </div>

      {/* Level Name */}
      <p
        style={{
          margin: 0,
          fontSize: TYPOGRAPHY.sizes.heading3,
          fontWeight: TYPOGRAPHY.weights.semibold,
          color: COLORS.black,
          marginBottom: '16px',
        }}
      >
        {currentLevelName}
      </p>

      {/* Progress Bar */}
      <div
        style={{
          width: '200px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            height: '8px',
            backgroundColor: COLORS.lightGray,
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: COLORS.black,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Progress Text */}
      <p
        style={{
          margin: 0,
          fontSize: TYPOGRAPHY.sizes.caption,
          color: COLORS.gray,
          marginBottom: '12px',
        }}
      >
        {Math.round(progressPercent)}% to next level
      </p>

      {/* Level Info */}
      <p
        style={{
          margin: 0,
          fontSize: TYPOGRAPHY.sizes.small,
          color: COLORS.gray,
        }}
      >
        {currentLevel} of {totalLevels}
      </p>
    </div>
  )
}
