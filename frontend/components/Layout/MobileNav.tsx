'use client'

import { useEffect, useState } from 'react'

/**
 * Mobile navigation utilities and hooks
 */

/**
 * Hook to check if the current viewport is mobile
 */
export const useMobileNav = () => {
  const [isMobileView, setIsMobileView] = useState(false)
  const [isTabletView, setIsTabletView] = useState(false)
  const [isDesktopView, setIsDesktopView] = useState(true)
  const [windowWidth, setWindowWidth] = useState(0)

  useEffect(() => {
    // Set initial values after mount
    const updateViewport = () => {
      const width = window.innerWidth
      setWindowWidth(width)
      setIsMobileView(width < 768)
      setIsTabletView(width >= 768 && width < 1024)
      setIsDesktopView(width >= 1024)
    }

    updateViewport()

    const handleResize = () => {
      updateViewport()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    isMobile: isMobileView,
    isTablet: isTabletView,
    isDesktop: isDesktopView,
    windowWidth,
  }
}

/**
 * Standalone utility functions
 */

/**
 * Check if the viewport is mobile (< 768px)
 */
export const isMobile = (width?: number): boolean => {
  if (width !== undefined) {
    return width < 768
  }
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768
  }
  return false
}

/**
 * Check if the viewport is tablet (768px - 1023px)
 */
export const isTablet = (width?: number): boolean => {
  if (width !== undefined) {
    return width >= 768 && width < 1024
  }
  if (typeof window !== 'undefined') {
    const w = window.innerWidth
    return w >= 768 && w < 1024
  }
  return false
}

/**
 * Check if the viewport is desktop (>= 1024px)
 */
export const isDesktop = (width?: number): boolean => {
  if (width !== undefined) {
    return width >= 1024
  }
  if (typeof window !== 'undefined') {
    return window.innerWidth >= 1024
  }
  return false
}

/**
 * Ensure touch-friendly button sizes (min 48px on mobile)
 */
export const getTouchFriendlySize = () => {
  return {
    minHeight: '48px',
    minWidth: '48px',
  }
}

/**
 * Get safe area insets for devices with notches/dynamic island
 */
export const getSafeAreaInsets = (): { top: string; bottom: string; left: string; right: string } => {
  if (typeof window === 'undefined') {
    return { top: '0', bottom: '0', left: '0', right: '0' }
  }

  const root = document.documentElement
  const top = getComputedStyle(root).getPropertyValue('--safe-area-inset-top') || '0'
  const bottom = getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom') || '0'
  const left = getComputedStyle(root).getPropertyValue('--safe-area-inset-left') || '0'
  const right = getComputedStyle(root).getPropertyValue('--safe-area-inset-right') || '0'

  return { top, bottom, left, right }
}
