'use client'

import React, { ReactNode, ReactElement } from 'react'
import { WarningCircle, ArrowLeft } from 'phosphor-react'
import { Button } from '../Common/Button'
import Link from 'next/link'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    })

    // Call optional error callback (for logging, Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="fixed inset-0 bg-white flex items-center justify-center p-lg z-50">
          <div className="w-full max-w-md">
            {/* Icon */}
            <div className="flex justify-center mb-lg">
              <div className="w-16 h-16 rounded-full bg-pale-red flex items-center justify-center">
                <WarningCircle size={32} weight="bold" className="text-red-600" />
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-lg">
              <h1 className="text-heading-3 font-bold text-black mb-md">
                Đã xảy ra lỗi
              </h1>
              <p className="text-body text-gray">
                Có lỗi không mong muốn xảy ra. Vui lòng thử lại hoặc quay về trang chủ.
              </p>
            </div>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-lg p-lg bg-pale-red rounded-card border border-light-gray overflow-auto max-h-48">
                <p className="text-caption text-gray font-mono whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <p className="text-caption text-gray font-mono mt-md whitespace-pre-wrap break-words">
                    {this.state.errorInfo.componentStack}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-md">
              <Button
                variant="primary"
                size="md"
                onClick={this.resetError}
                className="flex-1 flex items-center justify-center gap-sm"
              >
                Thử lại
              </Button>
              <Link href="/" className="flex-1">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full flex items-center justify-center gap-sm"
                >
                  <ArrowLeft size={18} weight="bold" />
                  Trang chủ
                </Button>
              </Link>
            </div>

            {/* Support message */}
            <p className="text-caption text-gray text-center mt-lg">
              Nếu lỗi vẫn tiếp diễn, vui lòng liên hệ{' '}
              <a href="mailto:support@team.com" className="text-black font-bold hover:underline">
                support@team.com
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
