import { useToast as useToastContext } from '@/components/Common/Toast'

// Thin wrapper so existing call sites (`const { toast } = useToast(); toast(msg, type)`)
// don't need to change, while actually rendering a toast via ToastProvider
// (mounted in app/layout.tsx).
export function useToast() {
  const { addToast } = useToastContext()
  return { toast: addToast }
}
