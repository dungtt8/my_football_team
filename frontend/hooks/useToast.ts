import { useState, useCallback } from 'react'

export function useToast() {
  const toast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`)
    // In production, this would trigger the ToastContext
    // For now, just log to console
  }

  return { toast }
}
