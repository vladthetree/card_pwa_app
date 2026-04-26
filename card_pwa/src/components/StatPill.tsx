export function StatPill({
  label,
  value,
  color,
  onClick,
  title,
}: {
  label: string
  value: number
  color: string
  onClick?: () => void
  title?: string
}) {
  const interactive = typeof onClick === 'function'
  const className = `w-full flex min-h-[4.25rem] flex-col items-center justify-center rounded-[14px] border border-[#18181b] bg-[#0c0c0c] px-2 py-2.5 text-left shadow-card sm:min-h-[8.5rem] sm:px-4 sm:py-10 ${interactive ? 'cursor-pointer hover:border-[#3f3f46] hover:bg-[#111] active:scale-[0.99] transition-all duration-200 ease-out' : 'cursor-default'}`
  const content = (
    <>
      <span className={`text-[1.85rem] sm:text-7xl font-black font-mono tabular-nums leading-none ${color}`}>{value}</span>
      <span className="mt-1 text-[10px] font-mono text-zinc-500 uppercase tracking-[0.12em] text-center leading-tight sm:mt-2 sm:tracking-widest">{label}</span>
    </>
  )

  if (!interactive) {
    return (
      <div className={className} title={title} aria-label={`${label}: ${value}`}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={className}
      aria-label={`${label}: ${value}`}
    >
      {content}
    </button>
  )
}
