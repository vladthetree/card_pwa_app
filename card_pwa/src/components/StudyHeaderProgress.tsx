import { AnimatePresence, motion } from 'framer-motion'
import ProgressBar from './ProgressBar'

export interface RewardHint {
  id: string
  xp: number
  combo: number
  label: string
  tone: 'success' | 'practice'
}

interface Props {
  current: number
  total: number
  reward: RewardHint | null
  reducedMotion: boolean | null
}

export default function StudyHeaderProgress({ current, total, reward, reducedMotion }: Props) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0

  return (
    <div className="relative pt-4">
      <AnimatePresence initial={false}>
        {reward && (
          <motion.div
            key={reward.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.22, ease: 'easeOut' }}
            className="pointer-events-none absolute right-0 top-0 z-10 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500"
            aria-live="polite"
          >
            <span className={reward.tone === 'success' ? 'font-bold text-[--brand-primary]' : 'font-bold text-amber-300'}>
              +{reward.xp} XP
            </span>
            {reward.combo >= 3 && <span className="text-zinc-600"> / {reward.combo}x</span>}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative">
        <ProgressBar current={current} total={total} />
        <AnimatePresence initial={false}>
          {reward && (
            <motion.span
              key={`${reward.id}-tick`}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scaleY: 0.5 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.1 : 0.2, ease: 'easeOut' }}
              className="absolute -top-[3px] h-[9px] w-px origin-bottom bg-[--brand-primary]"
              style={{ left: `${percentage}%` }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
