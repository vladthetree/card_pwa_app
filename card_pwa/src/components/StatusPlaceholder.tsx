import { AlertCircle, SearchX, Inbox } from 'lucide-react'

interface Props {
  variant: 'loading' | 'empty' | 'error' | 'no-results'
  title?: string
  message?: string
  action?: { label: string; onClick: () => void }
}

const CONFIG = {
  loading: {
    icon: null,
    defaultTitle: '',
    color: 'text-white/40',
  },
  empty: {
    icon: Inbox,
    defaultTitle: '',
    color: 'text-white/30',
  },
  error: {
    icon: AlertCircle,
    defaultTitle: '',
    color: 'text-rose-400/70',
  },
  'no-results': {
    icon: SearchX,
    defaultTitle: '',
    color: 'text-white/30',
  },
}

export default function StatusPlaceholder({ variant, title, message, action }: Props) {
  const cfg = CONFIG[variant]
  const Icon = cfg.icon

  if (variant === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
        {message && <p className="text-xs text-white/40">{message}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
      {Icon && <Icon size={32} className={`${cfg.color} mb-1`} strokeWidth={1.5} />}
      {title && <p className={`text-sm font-medium ${cfg.color}`}>{title}</p>}
      {message && <p className="text-xs text-white/35 max-w-xs">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
