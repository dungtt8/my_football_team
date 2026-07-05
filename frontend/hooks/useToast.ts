import { useToast as useToastContext } from '@/contexts/ToastContext'

// Thin wrapper so existing call sites (`const { toast } = useToast(); toast(msg, type)`)
// don't need to change, while actually rendering a toast via ToastContext/ToastProvider
// (mounted in app/layout.tsx) instead of the old stub that only did console.log.
export function useToast() {
  const { addToast } = useToastContext()
  return { toast: addToast }
}
