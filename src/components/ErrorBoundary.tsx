import { Component, type ErrorInfo, type ReactNode } from 'react'
import { t } from '../i18n'

type State = { error: Error | null }

/**
 * Catches a rendering error so one broken screen shows a message and a way out, instead of
 * a blank page. Give it a `key` that changes with the route so moving to another page resets it.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-[#0b1c30]">{t('error.title', 'Something went wrong on this screen')}</h1>
        <p className="max-w-md text-sm text-[#434655]">
          {t('error.body', 'Your data is safe. Reload the page to continue. If it keeps happening, tell us what you were doing.')}
        </p>
        <pre className="max-w-xl overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-left text-xs text-slate-600">{error.message}</pre>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-[#004ac6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb]"
          >
            {t('error.reload', 'Reload page')}
          </button>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0b1c30] hover:bg-slate-50"
          >
            {t('error.retry', 'Try again')}
          </button>
        </div>
      </div>
    )
  }
}
