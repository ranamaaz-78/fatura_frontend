import { useState, type DragEvent, type ReactNode } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

export type FileDropzoneProps = {
  accept?: string
  onFile: (file: File) => void
  children?: ReactNode
  disabled?: boolean
}

export function FileDropzone({ accept, onFile, children, disabled }: FileDropzoneProps) {
  const [over, setOver] = useState(false)

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setOver(false)
    if (disabled) return
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center text-center cursor-pointer',
        'rounded-2xl border-2 border-dashed border-line p-8',
        'transition-colors',
        over && 'border-brand-500 bg-brand-50/40',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
        }}
      />
      {children ?? (
        <p className="text-sm text-ink-muted">{t('common.dropFile', 'Drop a file here or click to browse')}</p>
      )}
    </label>
  )
}
