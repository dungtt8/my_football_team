import React from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  count?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  className = '',
  count = 1,
}) => {
  const skeletons = Array.from({ length: count })

  return (
    <>
      {skeletons.map((_, index) => (
        <div
          key={index}
          className={`bg-bone animate-pulse rounded-card ${className}`}
          style={{
            width: typeof width === 'number' ? `${width}px` : width,
            height: typeof height === 'number' ? `${height}px` : height,
          }}
        />
      ))}
    </>
  )
}

export const CardSkeleton: React.FC = () => {
  return (
    <div className="space-y-md p-xl border border-light-gray rounded-card bg-white">
      <Skeleton height={24} className="w-3/4" />
      <div className="space-y-md">
        <Skeleton height={16} />
        <Skeleton height={16} className="w-5/6" />
      </div>
      <Skeleton height={40} className="w-1/3" />
    </div>
  )
}

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-lg">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-md p-lg border border-light-gray rounded-card bg-white">
          <div className="flex justify-between">
            <Skeleton width="40%" height={16} />
            <Skeleton width="20%" height={16} />
          </div>
          <Skeleton height={12} className="w-3/4" />
        </div>
      ))}
    </div>
  )
}
