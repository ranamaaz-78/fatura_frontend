import { useQuery } from '@tanstack/react-query'
import { getDesktopRelease } from '../../../services/desktopApp'

/** The Windows installer on offer (null before the platform admin uploads one). Shared by every download link. */
export function useDesktopRelease() {
  return useQuery({
    queryKey: ['public', 'desktop-app'],
    queryFn: getDesktopRelease,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}
