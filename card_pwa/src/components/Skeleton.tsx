interface Props {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const radiusMap = { sm: 'rounded-lg', md: 'rounded-[12px]', lg: 'rounded-[14px]', full: 'rounded-full' }

export function Skeleton({ className = '', rounded = 'md' }: Props) {
  return (
    <div
      className={`skeleton-shimmer ${radiusMap[rounded]} ${className}`}
      role="presentation"
      aria-hidden="true"
    />
  )
}

export function DeckCardSkeleton() {
  return (
    <div className="rounded-[14px] border border-[#18181b] bg-[#0c0c0c] p-4 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-6 w-12" rounded="lg" />
      </div>
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-3 w-16" rounded="sm" />
        <Skeleton className="h-3 w-12" rounded="sm" />
        <Skeleton className="h-3 w-10" rounded="sm" />
      </div>
    </div>
  )
}

export function CardFaceSkeleton() {
  return (
    <div className="rounded-[12px] border border-[#18181b] bg-[#0c0c0c] p-8 flex flex-col items-center justify-center min-h-[200px] gap-3 shadow-card">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-2/5" />
    </div>
  )
}
