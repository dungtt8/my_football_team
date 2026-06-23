'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuthToken } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code) {
          console.error('No authorization code received')
          router.push('/login')
          return
        }

        // Exchange code for token
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/zalo/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('Auth callback failed:', data.error)
          router.push('/login')
          return
        }

        // Store auth data
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('team', JSON.stringify(data.team))
        localStorage.setItem('role', data.role)

        // Update auth context
        setAuthToken(data.token)

        // Redirect to app
        router.push('/app/finance')
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login')
      }
    }

    handleCallback()
  }, [searchParams, router, setAuthToken])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center space-y-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-sage border-t-espresso mx-auto" />
        <p className="text-body text-taupe">Authenticating...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center">
          <div className="text-center space-y-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-sage border-t-espresso mx-auto" />
            <p className="text-body text-taupe">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
