import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logError } from '../services/errorLog'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError('error-boundary', error.message, [error.stack, errorInfo.componentStack].filter(Boolean).join('\n'))
    console.error('[AppErrorBoundary] Uncaught error', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--theme-background, #09090f)' }}>
          <div className="w-full max-w-lg ds-card p-8 text-center text-white transition-all duration-300 ease-out">
            <h1 className="text-xl font-black mb-2">Something went wrong</h1>
            <p className="text-white/60 text-sm mb-6">
              The app hit an unexpected error. Reload to recover your session.
            </p>
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-[12px] font-black text-white transition-all duration-200 ease-out active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary-80), var(--brand-primary))' }}
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
