import { api, unwrap } from './api'

/* ------------------------------------------------------------------ the public website */

export type PublicFaq = { id: number; question: string; answer: string }
export type PublicPage = { title: string; body: string; updated_at: string | null }

export type PublicSiteContent = {
  locale: 'en' | 'es'
  faqs: PublicFaq[]
  pages: Partial<Record<'privacy' | 'terms', PublicPage>>
}

/** The FAQ and legal pages in the visitor's language (the request carries it). Anything not translated yet is English. */
export function getPublicSiteContent(): Promise<PublicSiteContent> {
  return unwrap<PublicSiteContent>(api.get('/public/site-content'))
}

/* ------------------------------------------------------------------ the admin panel */

export type SiteFaq = {
  id: number
  question_en: string
  answer_en: string
  question_es: string | null
  answer_es: string | null
  sort_order: number
  is_published: boolean
}

export type SiteFaqInput = {
  question_en: string
  answer_en: string
  question_es: string
  answer_es: string
  is_published: boolean
}

export type SitePageSlug = 'privacy' | 'terms'

export type SitePage = {
  slug: SitePageSlug
  title_en: string
  title_es: string | null
  body_en: string
  body_es: string | null
  updated_at: string | null
}

export type SitePageInput = { title_en: string; title_es: string; body_en: string; body_es: string }

export type SiteContentAdmin = { faqs: SiteFaq[]; pages: Record<SitePageSlug, SitePage | null> }

export function getSiteContent(): Promise<SiteContentAdmin> {
  return unwrap<SiteContentAdmin>(api.get('/admin/site-content'))
}

export function createFaq(input: SiteFaqInput): Promise<SiteFaq> {
  return unwrap<SiteFaq>(api.post('/admin/site-content/faqs', input))
}

export function updateFaq(id: number, input: Partial<SiteFaqInput>): Promise<SiteFaq> {
  return unwrap<SiteFaq>(api.patch(`/admin/site-content/faqs/${id}`, input))
}

export function deleteFaq(id: number): Promise<unknown> {
  return unwrap(api.delete(`/admin/site-content/faqs/${id}`))
}

/** The questions in the order the website should show them. */
export function reorderFaqs(ids: number[]): Promise<SiteContentAdmin> {
  return unwrap<SiteContentAdmin>(api.post('/admin/site-content/faqs/reorder', { ids }))
}

export function savePage(slug: SitePageSlug, input: SitePageInput): Promise<SitePage> {
  return unwrap<SitePage>(api.put(`/admin/site-content/pages/${slug}`, input))
}
