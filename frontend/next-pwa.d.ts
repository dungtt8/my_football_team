declare module 'next-pwa' {
  import type { NextConfig } from 'next'
  
  interface PWAConfig {
    dest?: string
    disable?: boolean
    runtimeCaching?: Array<{
      urlPattern: RegExp
      handler: string
      options: {
        cacheName: string
        expiration?: {
          maxEntries: number
        }
      }
    }>
    [key: string]: any
  }
  
  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig
  export default withPWA
}
