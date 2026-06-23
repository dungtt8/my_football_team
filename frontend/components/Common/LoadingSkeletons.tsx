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

// Skeleton variants

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-md p-xl border border-light-gray rounded-card bg-white">
          <Skeleton height={24} className="w-3/4" />
          <div className="space-y-md">
            <Skeleton height={16} />
            <Skeleton height={16} className="w-5/6" />
          </div>
          <Skeleton height={40} className="w-1/3" />
        </div>
      ))}
    </>
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

export const ListItemSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex gap-lg items-center p-lg border-b border-light-gray">
          <Skeleton width={48} height={48} className="rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-md min-w-0">
            <Skeleton height={16} className="w-2/3" />
            <Skeleton height={12} className="w-1/2" />
          </div>
          <Skeleton width={20} height={20} className="flex-shrink-0" />
        </div>
      ))}
    </>
  )
}

export const TableRowSkeleton: React.FC<{ columns?: number; count?: number }> = ({
  columns = 4,
  count = 3,
}) => {
  return (
    <div className="space-y-md">
      {Array.from({ length: count }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-md items-center p-lg bg-white border border-light-gray rounded-card">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1">
              <Skeleton height={16} className={colIndex === columns - 1 ? 'w-2/3' : ''} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="space-y-xl p-xl border border-light-gray rounded-card bg-white">
      <Skeleton height={24} className="w-1/2" />
      <div className="space-y-md">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex gap-lg items-center">
            <Skeleton width={40} height={40} />
            <div className="flex-1">
              <Skeleton height={12} className="w-full mb-md" />
              <Skeleton height={8} className="w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => {
  return (
    <div className="space-y-lg p-xl border border-light-gray rounded-card bg-white">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-md">
          <Skeleton height={12} className="w-1/4" />
          <Skeleton height={40} />
        </div>
      ))}
      <div className="flex gap-lg pt-lg">
        <Skeleton height={40} className="w-1/3" />
        <Skeleton height={40} className="w-1/3" />
      </div>
    </div>
  )
}

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="space-y-xl p-xl border border-light-gray rounded-card bg-white">
      <div className="flex flex-col items-center text-center">
        <Skeleton width={80} height={80} className="rounded-full mb-lg" />
        <Skeleton height={24} className="w-2/3 mb-md" />
        <Skeleton height={16} className="w-1/2 mb-lg" />
        <Skeleton height={12} className="w-full" />
      </div>
    </div>
  )
}

// Enum for skeleton variants
export enum SkeletonVariants {
  Card = 'card',
  List = 'list',
  ListItem = 'listItem',
  TableRow = 'tableRow',
  Chart = 'chart',
  Form = 'form',
  Profile = 'profile',
}

// Map variant to component
export const getSkeletonComponent = (
  variant: SkeletonVariants,
  props?: any
): React.ReactElement => {
  switch (variant) {
    case SkeletonVariants.Card:
      return <CardSkeleton {...props} />
    case SkeletonVariants.List:
      return <ListSkeleton {...props} />
    case SkeletonVariants.ListItem:
      return <ListItemSkeleton {...props} />
    case SkeletonVariants.TableRow:
      return <TableRowSkeleton {...props} />
    case SkeletonVariants.Chart:
      return <ChartSkeleton />
    case SkeletonVariants.Form:
      return <FormSkeleton {...props} />
    case SkeletonVariants.Profile:
      return <ProfileSkeleton />
    default:
      return <CardSkeleton {...props} />
  }
}
