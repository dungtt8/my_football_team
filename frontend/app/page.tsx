'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, isLoading, team } = useAuth()

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

    // Everyone lands on the Home dashboard
    router.push('/app/home')
  }, [isAuthenticated, isLoading, team, router])

  return null
}

