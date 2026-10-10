import { useQuery } from '@tanstack/react-query'
import { getLocale } from '../../../i18n'
import { getPublicSiteContent } from '../../../services/siteContent'

/**
 * The FAQ and legal pages the platform admin keeps, in the language the site is showing. The language is part of the
 * key, so switching language loads that language's text.
 */
export function useSiteContent() {
  return useQuery({
    queryKey: ['public', 'site-content', getLocale()],
    queryFn: getPublicSiteContent,
    staleTime: 60_000,
    retry: 1,
  })
}
