'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading, role, team } = useAuth()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Authenticated but no team → onboarding
    if (!team) {
      router.push('/onboarding')
      return
    }

    // Role-based redirect
    if (role === 'co_manager' || role === 'manager' || role === 'owner') {
      router.push('/app/finance')
    } else {
      router.push('/app/attendance')
    }
  }, [isAuthenticated, isLoading, role, team, router])

  return null
}

