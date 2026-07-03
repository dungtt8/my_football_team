'use client'

import React from 'react'
import { AttendanceCheckin } from '@/hooks/useAttendance'

const G = {
  glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)', glassHover: 'rgba(255,255,255,0.11)',
  accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)', red: '#FF6B6B', redDim: 'rgba(255,107,107,0.12)',
  t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

interface AttendanceListProps {
  records: AttendanceCheckin[]
  isLoading: boolean
  onRecordClick?: (id: string) => void
  emptyMessage?: string
}

const SESSION_TYPE_LABEL: Record<string, string> = {
  training: 'Tập luyện',
  match: 'Trận đấu',
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  records,
  isLoading,
  onRecordClick,
  emptyMessage = 'Không có bản ghi điểm danh nào',
}) => {
  const getResponseBadge = (response: 'yes' | 'no' | null) => {
    const style =
      response === 'yes'
        ? { bg: G.accentDim, text: G.accent, label: 'Tham gia' }
        : response === 'no'
          ? { bg: G.redDim, text: G.red, label: 'Vắng' }
          : { bg: 'rgba(255,255,255,0.08)', text: G.t2, label: 'Chưa phản hồi' }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          background: style.bg,
          color: style.text,
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {style.label}
      </span>
    )
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ height: '60px', background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '14px', animation: 'pulse 2s infinite' }} />
        ))}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: G.t2 }}>
        <p style={{ margin: 0, fontSize: '14px' }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {records.map((record) => (
        <div
          key={record.id}
          onClick={() => onRecordClick?.(record.id)}
          style={{
            padding: '14px 16px',
            border: `1px solid ${G.glassBorder}`,
            borderRadius: '14px',
            background: G.glass,
            cursor: onRecordClick ? 'pointer' : 'default',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
          onMouseOver={(e) => { if (onRecordClick) (e.currentTarget as HTMLElement).style.background = G.glassHover }}
          onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = G.glass }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.t1 }}>
              {formatDate(record.session_date)} · {SESSION_TYPE_LABEL[record.session_type ?? ''] || 'Buổi tập'}
            </p>
            {record.location && (
              <p style={{ margin: 0, fontSize: '12px', color: G.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📍 {record.location}
              </p>
            )}
          </div>

          <div style={{ flexShrink: 0 }}>
            {getResponseBadge(record.response)}
          </div>
        </div>
      ))}
    </div>
  )
}
