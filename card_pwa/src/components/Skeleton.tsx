interface Props {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const radiusMap = { sm: 'rounded-lg', md: 'rounded-xl', lg: 'rounded-2xl', full: 'rounded-full' }

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
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
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
    <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.02] p-8 flex flex-col items-center justify-center min-h-[200px] gap-3">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-2/5" />
    </div>
  )
}
