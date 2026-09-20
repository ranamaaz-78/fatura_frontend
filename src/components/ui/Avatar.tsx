import { cn } from '../../lib/cn'

export type AvatarProps = {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
} as const

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'F'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      title={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold',
        sizes[size],
        className,
      )}
    >
      {initialsFromName(name)}
    </div>
  )
}
