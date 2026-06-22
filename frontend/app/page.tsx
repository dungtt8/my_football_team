'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to finance app on load
    router.push('/app/finance')
  }, [router])

  return null
}

