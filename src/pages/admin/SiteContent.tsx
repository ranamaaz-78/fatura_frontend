import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Eye, EyeOff, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { Tabs } from '../../components/ui/Tabs'
import { Textarea } from '../../components/ui/Textarea'
import { Toggle } from '../../components/ui/Toggle'
import { useToast } from '../../components/ui/Toast'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/format'
import { getErrorMessage, mapValidationErrors } from '../../services/api'
import {
  createFaq,
  deleteFaq,
  getSiteContent,
  reorderFaqs,
  savePage,
  updateFaq,
  type SiteFaq,
  type SiteFaqInput,
  type SitePage,
  type SitePageInput,
  type SitePageSlug,
} from '../../services/siteContent'

const contentKey = ['admin', 'site-content']

type TabId = 'faqs' | SitePageSlug

const BLANK_FAQ: SiteFaqInput = { question_en: '', answer_en: '', question_es: '', answer_es: '', is_published: true }

/** What the website shows to visitors, for the admin to keep: the FAQ and the legal pages, each in both languages. */
export default function SiteContent() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: contentKey, queryFn: getSiteContent })
  const [tab, setTab] = useState<TabId>('faqs')

  /** The website reads this too, so what it shows is refreshed along with the admin's copy. */
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: contentKey })
    void queryClient.invalidateQueries({ queryKey: ['public', 'site-content'] })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('admin.siteContent', 'Website content')}
        subtitle={t('admin.siteContentHint', 'The FAQ, privacy policy and terms shown on the website. Write each in English and Spanish: visitors see the language they are using.')}
      />

      <div className="rounded-2xl border border-line/80 bg-card shadow-xs">
        <div className="border-b border-line px-5 pt-2">
          <Tabs
            value={tab}
            onChange={(id) => setTab(id as TabId)}
            items={[
              { id: 'faqs', label: t('admin.tabFaqs', 'FAQs') },
              { id: 'privacy', label: t('admin.tabPrivacy', 'Privacy policy') },
              { id: 'terms', label: t('admin.tabTerms', 'Terms and conditions') },
            ]}
          />
        </div>

        <div className="p-5 sm:p-6">
          {query.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : query.isError || !query.data ? (
            <EmptyState
              icon={FileText}
              title={t('common.error', 'Something went wrong')}
              description={getErrorMessage(query.error)}
              primaryAction={<Button onClick={() => void query.refetch()}>{t('common.retry', 'Retry')}</Button>}
            />
          ) : tab === 'faqs' ? (
            <FaqEditor faqs={query.data.faqs} onChanged={refresh} />
          ) : (
            <PageEditor key={tab} slug={tab} page={query.data.pages[tab]} onSaved={refresh} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ the FAQ */

function Language({ children }: { children: string }) {
  return <span className="rounded-md bg-page px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-ink-muted uppercase">{children}</span>
}

function FaqEditor({ faqs, onChanged }: { faqs: SiteFaq[]; onChanged: () => void }) {
  const { push } = useToast()
  const [editing, setEditing] = useState<SiteFaq | 'new' | null>(null)
  const [form, setForm] = useState<SiteFaqInput>(BLANK_FAQ)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [removing, setRemoving] = useState<SiteFaq | null>(null)

  useEffect(() => {
    if (editing === null) return
    setErrors({})
    setForm(
      editing === 'new'
        ? BLANK_FAQ
        : {
            question_en: editing.question_en,
            answer_en: editing.answer_en,
            question_es: editing.question_es ?? '',
            answer_es: editing.answer_es ?? '',
            is_published: editing.is_published,
          },
    )
  }, [editing])

  const save = useMutation({
    mutationFn: () => (editing === 'new' || editing === null ? createFaq(form) : updateFaq(editing.id, form)),
    onSuccess: () => {
      const created = editing === 'new'
      setEditing(null)
      onChanged()
      push({ tone: 'success', title: created ? t('admin.faqAdded', 'Question added.') : t('admin.faqSaved', 'Question saved.') })
    },
    onError: (error) => {
      setErrors(mapValidationErrors(error))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const publish = useMutation({
    mutationFn: (faq: SiteFaq) => updateFaq(faq.id, { is_published: !faq.is_published }),
    onSuccess: onChanged,
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const remove = useMutation({
    mutationFn: (faq: SiteFaq) => deleteFaq(faq.id),
    onSuccess: () => {
      setRemoving(null)
      onChanged()
      push({ tone: 'success', title: t('admin.faqDeleted', 'Question deleted.') })
    },
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  const reorder = useMutation({
    mutationFn: (ids: number[]) => reorderFaqs(ids),
    onSuccess: onChanged,
    onError: (error) => push({ tone: 'danger', title: getErrorMessage(error) }),
  })

  function move(index: number, by: -1 | 1) {
    const ids = faqs.map((faq) => faq.id)
    const target = index + by
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {t('admin.faqHint', 'They appear on the website in this order. A question with no Spanish yet is shown in English.')}
        </p>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
          {t('admin.addFaq', 'Add question')}
        </Button>
      </div>

      {faqs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('admin.faqEmptyTitle', 'No questions yet')}
          description={t('admin.faqEmptyBody', 'The website hides the FAQ section until there is at least one published question.')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {faqs.map((faq, index) => (
            <li key={faq.id} className={cn('flex items-start gap-3 rounded-2xl border border-line p-4', !faq.is_published && 'bg-page/60')}>
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                {index + 1}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-start gap-2">
                  <Language>EN</Language>
                  <span className="text-sm font-semibold text-ink">{faq.question_en}</span>
                </span>
                <span className="mt-1 flex items-start gap-2">
                  <Language>ES</Language>
                  {faq.question_es ? (
                    <span className="text-sm text-ink-muted">{faq.question_es}</span>
                  ) : (
                    <span className="text-xs font-medium text-amber-700">{t('admin.noSpanish', 'No Spanish yet: the English is shown')}</span>
                  )}
                </span>
                {!faq.is_published ? (
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {t('admin.hidden', 'Hidden from the website')}
                  </span>
                ) : null}
              </span>

              <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                <Button variant="ghost" size="sm" aria-label={t('admin.moveUp', 'Move up')} icon={<ArrowUp className="h-4 w-4" />} disabled={index === 0 || reorder.isPending} onClick={() => move(index, -1)} />
                <Button variant="ghost" size="sm" aria-label={t('admin.moveDown', 'Move down')} icon={<ArrowDown className="h-4 w-4" />} disabled={index === faqs.length - 1 || reorder.isPending} onClick={() => move(index, 1)} />
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={faq.is_published ? t('admin.hide', 'Hide') : t('admin.show', 'Show')}
                  icon={faq.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  loading={publish.isPending && publish.variables?.id === faq.id}
                  onClick={() => publish.mutate(faq)}
                />
                <Button variant="ghost" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(faq)}>
                  {t('common.edit', 'Edit')}
                </Button>
                <Button variant="ghost" size="sm" aria-label={t('common.delete', 'Delete')} icon={<Trash2 className="h-4 w-4 text-rose-600" />} onClick={() => setRemoving(faq)} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('admin.addFaq', 'Add question') : t('admin.editFaq', 'Edit question')}
        subtitle={t('admin.faqModalHint', 'English is required. Leave Spanish empty to show the English to Spanish visitors.')}
        maxWidth="4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button loading={save.isPending} disabled={form.question_en.trim() === '' || form.answer_en.trim() === ''} onClick={() => save.mutate()}>
              {t('common.save', 'Save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold tracking-wide text-ink uppercase">English</p>
            <Input label={t('admin.question', 'Question')} required value={form.question_en} error={errors.question_en} onChange={(event) => setForm({ ...form, question_en: event.target.value })} />
            <Textarea label={t('admin.answer', 'Answer')} required rows={6} value={form.answer_en} error={errors.answer_en} onChange={(event) => setForm({ ...form, answer_en: event.target.value })} />
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold tracking-wide text-ink uppercase">Español</p>
            <Input label={t('admin.question', 'Question')} value={form.question_es} error={errors.question_es} onChange={(event) => setForm({ ...form, question_es: event.target.value })} />
            <Textarea label={t('admin.answer', 'Answer')} rows={6} value={form.answer_es} error={errors.answer_es} onChange={(event) => setForm({ ...form, answer_es: event.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <Toggle checked={form.is_published} onChange={(checked) => setForm({ ...form, is_published: checked })} label={t('admin.published', 'Show on the website')} />
        </div>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing)}
        loading={remove.isPending}
        title={t('admin.faqDeleteTitle', 'Delete this question?')}
        description={t('admin.faqDeleteBody', 'It disappears from the website in both languages.')}
        confirmLabel={t('common.delete', 'Delete')}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ a legal page */

function PageEditor({ slug, page, onSaved }: { slug: SitePageSlug; page: SitePage | null; onSaved: () => void }) {
  const { push } = useToast()
  const [form, setForm] = useState<SitePageInput>({ title_en: '', title_es: '', body_en: '', body_es: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm({
      title_en: page?.title_en ?? '',
      title_es: page?.title_es ?? '',
      body_en: page?.body_en ?? '',
      body_es: page?.body_es ?? '',
    })
    setErrors({})
  }, [page])

  const save = useMutation({
    mutationFn: () => savePage(slug, form),
    onSuccess: () => {
      onSaved()
      push({ tone: 'success', title: t('admin.pageSaved', 'Saved. The website now shows it.') })
    },
    onError: (error) => {
      setErrors(mapValidationErrors(error))
      push({ tone: 'danger', title: getErrorMessage(error) })
    },
  })

  const dirty =
    form.title_en !== (page?.title_en ?? '') ||
    form.title_es !== (page?.title_es ?? '') ||
    form.body_en !== (page?.body_en ?? '') ||
    form.body_es !== (page?.body_es ?? '')

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-xs leading-relaxed text-ink-muted">
          {t('admin.pageFormat', 'Write a ## before a heading, a blank line between paragraphs, and a - before each bullet. The text before the first heading is the introduction.')}
        </p>
        {page?.updated_at ? (
          <span className="text-xs text-ink-muted">{t('admin.lastSaved', 'Last saved {date}', { date: formatDateTime(page.updated_at) })}</span>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold tracking-wide text-ink uppercase">English</p>
          <Input label={t('admin.pageTitle', 'Title')} required value={form.title_en} error={errors.title_en} onChange={(event) => setForm({ ...form, title_en: event.target.value })} />
          <Textarea label={t('admin.pageBody', 'Text')} required rows={20} className="font-mono text-[13px] leading-relaxed" value={form.body_en} error={errors.body_en} onChange={(event) => setForm({ ...form, body_en: event.target.value })} />
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold tracking-wide text-ink uppercase">Español</p>
          <Input label={t('admin.pageTitle', 'Title')} value={form.title_es} error={errors.title_es} onChange={(event) => setForm({ ...form, title_es: event.target.value })} />
          <Textarea label={t('admin.pageBody', 'Text')} rows={20} className="font-mono text-[13px] leading-relaxed" value={form.body_es} error={errors.body_es} hint={t('admin.noSpanishPage', 'Empty: Spanish visitors see the English.')} onChange={(event) => setForm({ ...form, body_es: event.target.value })} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty ? <span className="text-xs text-ink-muted">{t('whatsapp.unsaved', 'You have unsaved changes')}</span> : null}
        <Button loading={save.isPending} disabled={!dirty || form.title_en.trim() === '' || form.body_en.trim() === ''} onClick={() => save.mutate()}>
          {t('common.save', 'Save')}
        </Button>
      </div>
    </div>
  )
}
