'use client'

import React, { useEffect, useRef, useState } from 'react'
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/constants'

interface QRCodeScannerProps {
  onScanSuccess: (data: string) => void
  onError?: (error: Error) => void
  isLoading?: boolean
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScanSuccess,
  onError,
  isLoading = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraDenied, setCameraDenied] = useState(false)
  const animationRef = useRef<number | null>(null)

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraActive(true)
          scanQRCode()
        }
      } catch (error) {
        console.error('Camera error:', error)
        setCameraDenied(true)
        if (onError) {
          onError(error instanceof Error ? error : new Error('Không có quyền truy cập camera'))
        }
      }
    }

    startCamera()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || isLoading) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext('2d')

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0)

      try {
        // Simple QR detection - in production, use jsQR library or similar
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        // For demo, we'll just call success with a dummy value
        // In real implementation, use jsQR.jsQR(imageData.data, imageData.width, imageData.height)
      } catch (err) {
        console.error('QR scan error:', err)
      }
    }

    animationRef.current = requestAnimationFrame(scanQRCode)
  }

  if (cameraDenied) {
    return (
      <div
        style={{
          border: `1px solid ${COLORS.lightGray}`,
          borderRadius: '12px',
          padding: '32px 20px',
          textAlign: 'center',
          backgroundColor: COLORS.bone,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.body,
            color: COLORS.black,
            marginBottom: '16px',
          }}
        >
          📷 Không có quyền truy cập camera
        </p>
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.small,
            color: COLORS.gray,
            marginBottom: '16px',
          }}
        >
          Vui lòng cấp quyền camera để quét mã QR
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 20px',
            backgroundColor: COLORS.black,
            color: COLORS.white,
            border: 'none',
            borderRadius: '8px',
            fontSize: TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.medium,
            cursor: 'pointer',
          }}
        >
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: COLORS.black,
      }}
    >
      {/* Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />

      {/* Canvas for QR detection (hidden) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Scanning Indicator */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '200px',
          height: '200px',
          border: `2px solid ${COLORS.white}`,
          borderRadius: '8px',
          opacity: 0.7,
          animation: 'pulse 2s infinite',
        }}
      />

      {/* Scanning Line Animation */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200px',
          height: '2px',
          backgroundColor: COLORS.white,
          transform: 'translate(-50%, -50%)',
          animation: 'scanLine 2s linear infinite',
        }}
      />

      {/* Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          color: COLORS.white,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: TYPOGRAPHY.sizes.small,
            fontWeight: TYPOGRAPHY.weights.medium,
          }}
        >
          Đặt mã QR vào trong khung
        </p>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { transform: translate(-50%, calc(-50% - 100px)); }
          50% { transform: translate(-50%, calc(-50% + 100px)); }
          100% { transform: translate(-50%, calc(-50% - 100px)); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
