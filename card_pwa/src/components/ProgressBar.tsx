import { motion, useReducedMotion } from 'framer-motion'

interface Props {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: Props) {
  const prefersReducedMotion = useReducedMotion()
  const percentage = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="h-[3px] w-full bg-white/[0.09] overflow-hidden">
      <motion.div
        className={`h-full ${prefersReducedMotion ? 'bg-[--brand-primary]' : 'progress-bar-shimmer'}`}
        initial={false}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}
