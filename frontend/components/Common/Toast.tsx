'use client'

import React, { useState, useEffect } from 'react'

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        onClose(toast.id)
      }, toast.duration || 3000)
      return () => clearTimeout(timer)
    }
  }, [toast, onClose])

  const bgColors = {
    success: 'bg-pale-green text-green-800',
    error: 'bg-pale-red text-red-800',
    info: 'bg-pale-blue text-blue-800',
    warning: 'bg-pale-yellow text-yellow-800',
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  }

  return (
    <div
      className={`${bgColors[toast.type]} px-lg py-md rounded-card border border-light-gray flex items-center gap-md animate-in fade-in slide-in-from-bottom-4 duration-300`}
      role="alert"
    >
      <span className="text-lg font-bold">{icons[toast.type]}</span>
      <span className="text-small font-medium flex-1">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="text-lg leading-none hover:opacity-70 transition-opacity"
        aria-label="Close toast"
      >
        ✕
      </button>
    </div>
  )
}

export interface ToastContainerProps {
  toasts: ToastMessage[]
  onClose: (id: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-lg right-lg z-50 space-y-md max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}
