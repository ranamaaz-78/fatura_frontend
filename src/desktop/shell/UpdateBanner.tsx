import { AlertTriangle, Download, RefreshCw, Rocket, X } from 'lucide-react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { deskButtonClass } from '../ui/kit'
import { appUpdates } from './useAppUpdate'

/** Whether the updater has something to tell the person (a new version, its download, or a failure). */
export function updateWorthShowing(status: DesktopUpdateStatus | null): boolean {
  if (!status) return false
  if (status.state === 'error') return Boolean(status.version)
  return status.state === 'available' || status.state === 'downloading' || status.state === 'ready'
}

function megabytes(bytes = 0): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

/**
 * A new version of the app, at the top of every screen: offered, then downloading, then ready to install on restart.
 * "Later" hides the offer until the next start (the status bar still shows it).
 */
export function UpdateBanner({ status, onLater }: { status: DesktopUpdateStatus; onLater: () => void }) {
  const version = status.version ?? ''
  const failed = status.state === 'error'
  const ready = status.state === 'ready'
  const downloading = status.state === 'downloading'

  return (
    <section
      className={cn(
        'desk-glass-strong desk-pop relative overflow-hidden print:hidden',
        failed ? 'ring-1 ring-rose-500/35' : 'ring-1 ring-brand-600/30',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1.5', failed ? 'bg-rose-500' : 'bg-brand-600')} />
      <div className="flex flex-wrap items-center gap-4 py-4 pr-5 pl-6">
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            failed ? 'bg-rose-500/12 text-rose-600' : 'bg-brand-600/12 text-brand-600',
          )}
        >
          {failed ? <AlertTriangle className="h-5 w-5" /> : ready ? <Rocket className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-ink">
            {failed
              ? t('desk.updateFailed', 'The update could not be downloaded')
              : ready
                ? t('desk.updateReady', 'Version {version} is ready to install', { version })
                : t('desk.updateAvailable', 'A new version is available: {version}', { version })}
          </p>
          {failed ? (
            <p className="mt-0.5 truncate text-[12px] text-ink-muted">{status.message}</p>
          ) : ready ? (
            <p className="mt-0.5 text-[12px] text-ink-muted">{t('desk.updateReadyHint', 'The app closes for a moment, installs it and opens again. Finish what you are doing first.')}</p>
          ) : downloading ? (
            <div className="mt-2 max-w-md">
              <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${status.percent ?? 0}%` }} />
              </div>
              <p className="desk-num mt-1 text-[11px] text-ink-muted">
                {t('desk.updateDownloading', 'Downloading')} {status.percent ?? 0}%{status.total ? ` · ${megabytes(status.transferred)} / ${megabytes(status.total)}` : ''}
              </p>
            </div>
          ) : status.notes ? (
            <p className="mt-0.5 line-clamp-2 text-[12px] whitespace-pre-line text-ink-muted">{status.notes}</p>
          ) : (
            <p className="mt-0.5 text-[12px] text-ink-muted">{t('desk.updateAvailableHint', 'It downloads in the background while you keep working.')}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {failed ? (
            <button type="button" onClick={appUpdates.download} className={deskButtonClass('ghost')}>
              <RefreshCw className="h-4 w-4" />
              {t('common.retry', 'Retry')}
            </button>
          ) : ready ? (
            <button type="button" onClick={appUpdates.install} className={deskButtonClass('primary')}>
              <Rocket className="h-4 w-4" />
              {t('desk.updateInstall', 'Restart and install')}
            </button>
          ) : status.state === 'available' ? (
            <button type="button" onClick={appUpdates.download} className={deskButtonClass('primary')}>
              <Download className="h-4 w-4" />
              {t('desk.updateNow', 'Update now')}
            </button>
          ) : null}
          {!downloading ? (
            <button type="button" onClick={onLater} title={t('desk.updateLater', 'Later')} aria-label={t('desk.updateLater', 'Later')} className={deskButtonClass('quiet', 'w-10 px-0')}>
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
