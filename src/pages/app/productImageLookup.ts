import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { listProductImages } from '../../services/productImages'
import type { ProductImage } from '../../types/catalog'

export const productImagesKey = ['app', 'product-images']

const EXTENSIONS = /\.(jpe?g|png|webp|gif)$/i

/** Labels are stored without an extension, so drop one if a code still carries it. */
function normalise(value: string): string {
  return value.trim().replace(EXTENSIONS, '').toLowerCase()
}

/**
 * Looks a product's image code up in the image folder, the same way the folder
 * itself treats names: case-insensitive and without an extension.
 */
export function useProductImageLookup(): (imageCode: string | null) => ProductImage | null {
  const query = useQuery({
    queryKey: productImagesKey,
    queryFn: listProductImages,
    staleTime: 60_000,
  })

  const images = query.data

  return useCallback(
    (imageCode: string | null) => {
      if (!imageCode || !images) return null
      const wanted = normalise(imageCode)
      if (wanted === '') return null

      return images.find((image) => normalise(image.name) === wanted) ?? null
    },
    [images],
  )
}
