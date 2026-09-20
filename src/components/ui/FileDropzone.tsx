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
        'border-2 border-dashed border-slate-300 rounded-2xl p-8',
        'transition-colors',
        over && 'border-blue-400 bg-blue-50/40',
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
        <p className="text-sm text-slate-500">{t('common.dropFile', 'Drop a file here or click to browse')}</p>
      )}
    </label>
  )
}
