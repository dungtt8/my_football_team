'use client'

import React from 'react'

const G = {
  glass: '#FFFFFF', glassBorder: '#E7ECF3',
  accent: '#12B76A', blue: '#2E7CF6', red: '#F04438',
  t1: '#0B1220', t2: 'rgba(11,18,32,0.55)', t3: 'rgba(11,18,32,0.30)',
}

interface AttendanceStatsCardProps {
  totalPresent: number
  totalAbsent: number
  totalPending?: number
  attendancePercentage: number
  isLoading?: boolean
}

export const AttendanceStatsCard: React.FC<AttendanceStatsCardProps> = ({
  totalPresent,
  totalAbsent,
  totalPending = 0,
  attendancePercentage,
  isLoading = false,
}) => {
  const StatBox = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
    <div
      style={{
        padding: '16px',
        borderRadius: '14px',
        background: G.glass,
        border: `1px solid ${G.glassBorder}`,
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, fontSize: '12px', color: G.t2 }}>{label}</p>
      <p style={{ margin: '8px 0 0 0', fontSize: '22px', fontWeight: 700, color }}>{value}</p>
    </div>
  )

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            style={{ height: '78px', background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '14px', animation: 'pulse 2s infinite' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
      <StatBox label="Đã tham gia" value={totalPresent} color={G.accent} />
      <StatBox label="Vắng" value={totalAbsent} color={G.red} />
      <StatBox label="Chưa phản hồi" value={totalPending} color={G.t2} />
      <StatBox label="Tỉ lệ tham gia" value={`${Math.round(attendancePercentage)}%`} color={G.blue} />

      {/* Attendance Rate Bar - spans full width */}
      <div style={{ gridColumn: 'span 4', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '8px', background: '#E7ECF3', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${attendancePercentage}%`,
                background: G.accent,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: G.t2, minWidth: '40px' }}>
            {Math.round(attendancePercentage)}%
          </span>
        </div>
      </div>
    </div>
  )
}
