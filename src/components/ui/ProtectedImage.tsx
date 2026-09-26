import { useQuery } from '@tanstack/react-query'
import { ImageOff } from 'lucide-react'
import { cn } from '../../lib/cn'
import { loadImageBlob } from '../../services/productImages'

export type ProtectedImageProps = {
  /** Authenticated stream path, not a disk URL. */
  fileUrl: string
  alt: string
  className?: string
}

/** Renders a file that only the signed-in tenant may read. */
export function ProtectedImage({ fileUrl, alt, className }: ProtectedImageProps) {
  const query = useQuery({
    queryKey: ['app', 'image-blob', fileUrl],
    queryFn: () => loadImageBlob(fileUrl),
    staleTime: Infinity,
    retry: false,
  })

  if (query.isError) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={cn('flex items-center justify-center bg-slate-100 text-slate-400', className)}
      >
        <ImageOff className="h-5 w-5" />
      </span>
    )
  }

  if (!query.data) {
    return <span aria-hidden="true" className={cn('block animate-pulse bg-slate-100', className)} />
  }

  return <img src={query.data} alt={alt} className={className} draggable={false} />
}
