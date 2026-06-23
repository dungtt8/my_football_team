'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/Common/Button'
import { Card } from '@/components/Common/Card'
import { ArrowRight } from 'phosphor-react'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [isZaloLoading, setIsZaloLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/app/finance')
    }
  }, [isAuthenticated, isLoading, router])

  const handleZaloLogin = async () => {
    setIsZaloLoading(true)
    try {
      // Redirect to Zalo OA login
      const redirectUri = `${window.location.origin}/auth/callback`
      const clientId = process.env.NEXT_PUBLIC_ZALO_CLIENT_ID || ''
      const zaloAuthUrl = `https://oauth.zaloapp.com/v4/oa/permission?app_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=security_token`
      
      window.location.href = zaloAuthUrl
    } catch (error) {
      console.error('Zalo login error:', error)
      setIsZaloLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-fade-in">
          <p className="text-body text-taupe">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-lg py-4xl md:py-5xl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-tan/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Title Section */}
        <div className="text-center mb-5xl">
          <h1 className="text-hero font-serif text-espresso mb-lg">
            Football Team
          </h1>
          <p className="text-body text-taupe">
            Manage your team with intelligence
          </p>
        </div>

        {/* Login Card */}
        <Card className="py-4xl px-2xl">
          <div className="space-y-4xl">
            {/* Main CTA */}
            <div className="space-y-xl">
              <h2 className="text-heading-1 font-serif text-espresso text-center">
                Welcome
              </h2>
              <p className="text-body text-taupe text-center">
                Sign in with your Zalo account to continue
              </p>
            </div>

            {/* Zalo Login Button */}
            <Button
              variant="primary"
              size="md"
              onClick={handleZaloLogin}
              isLoading={isZaloLoading}
              className="w-full flex items-center justify-center gap-md"
            >
              <span>Login with Zalo</span>
              <ArrowRight size={20} weight="bold" />
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-lg">
              <div className="flex-1 h-px bg-espresso/10" />
              <span className="text-caption text-taupe/60">or</span>
              <div className="flex-1 h-px bg-espresso/10" />
            </div>

            {/* Features */}
            <div className="space-y-lg">
              <div className="flex gap-lg">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-espresso">Finance Tracking</p>
                  <p className="text-caption text-taupe/70">Manage team expenses with ease</p>
                </div>
              </div>

              <div className="flex gap-lg">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-espresso">Campaigns</p>
                  <p className="text-caption text-taupe/70">Organize team activities</p>
                </div>
              </div>

              <div className="flex gap-lg">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-espresso">Attendance & Rewards</p>
                  <p className="text-caption text-taupe/70">Gamified team engagement</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-4xl text-center">
          <p className="text-caption text-taupe/60">
            © 2026 Football Team Management. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
