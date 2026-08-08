'use client'

import React, { createContext, useContext, ReactNode, useCallback, useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, WarningCircle, X } from 'phosphor-react'

// ─── Types ─────────────────────────────────────────
interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  title?: string
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (
    message: string,
    type?: Toast['type'],
    options?: { duration?: number; title?: string }
  ) => void
  removeToast: (id: string) => void
}

// ─── Context ───────────────────────────────────────
const ToastContext = createContext<ToastContextType | undefined>(undefined)

// ─── Icons & Styles config ─────────────────────────
const toastConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-white border-emerald-200',
    text: 'text-emerald-600',
    progress: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-white border-red-200',
    text: 'text-red-600',
    progress: 'bg-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-white border-blue-200',
    text: 'text-blue-600',
    progress: 'bg-blue-500',
  },
  warning: {
    icon: WarningCircle,
    bg: 'bg-white border-amber-200',
    text: 'text-amber-600',
    progress: 'bg-amber-500',
  },
}

// ─── Toast Item Component ──────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config = toastConfig[toast.type]
  const Icon = config.icon
  const [progress, setProgress] = useState(100)
  const [visible, setVisible] = useState(false)
  const duration = toast.duration ?? 4000

  // Fade/slide in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 16)
    return () => clearInterval(interval)
  }, [duration])

  return (
    <div
      className={`relative flex items-start gap-3 min-w-[320px] max-w-[420px]
        px-4 py-3 rounded-xl border shadow-lg
        ${config.bg} transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
    >
      <Icon size={20} weight="fill" className={`mt-0.5 shrink-0 ${config.text}`} />

      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`font-semibold text-sm ${config.text}`}>
            {toast.title}
          </p>
        )}
        <p className="text-sm text-slate-700 leading-relaxed">
          {toast.message}
        </p>
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 p-1 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <X size={16} className="text-slate-400" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 rounded-b-xl overflow-hidden">
        <div
          className={`h-full ${config.progress}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// ─── Provider ──────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((
    message: string,
    type: Toast['type'] = 'info',
    options?: { duration?: number; title?: string }
  ) => {
    const id = Math.random().toString(36).slice(2, 9)
    const toast: Toast = {
      id,
      message,
      type,
      duration: options?.duration ?? 4000,
      title: options?.title,
    }

    setToasts((prev) => [...prev, toast])

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────
export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
