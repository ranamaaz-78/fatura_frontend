import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { optionsFromChildren, SearchableSelect } from './SearchableSelect'
import { t } from '../../i18n'

/**
 * Form controls for the marketing and auth shells. They are taller and softer
 * than the ones in `Input`/`Select`/`Textarea`, which stay tuned for the dense
 * admin and workspace tables.
 */
/** Width is left to the caller so the phone row can split a code box off the number. */
const control =
  'rounded-xl border border-[#dbe1ff] bg-white text-[15px] text-[#0b1c30] outline-none transition ' +
  'placeholder:text-[#94a3b8] focus:border-[#004ac6] focus:ring-4 focus:ring-[#004ac6]/12 ' +
  'disabled:bg-slate-50 disabled:text-slate-400'

const invalid = 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/15'

const boxed = 'h-12 w-full px-3.5'

type FieldShellProps = {
  id: string
  label?: ReactNode
  required?: boolean
  optional?: boolean
  hint?: string
  error?: string
  /** Rendered on the right of the label row, e.g. the "same as phone" toggle. */
  action?: ReactNode
  className?: string
  children: ReactNode
}

export function PublicFieldShell({
  id,
  label,
  required,
  optional,
  hint,
  error,
  action,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {label ? (
        <div className="mb-[7px] flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-[13px] font-semibold text-[#334155]">
            {label}
            {required ? <span className="ml-0.5 text-[#be123c]">*</span> : null}
            {optional ? <span className="ml-1 font-normal text-[#64748b]">{t('publicField.optional', '(optional)')}</span> : null}
          </label>
          {action}
        </div>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-[#64748b]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type Shared = Pick<FieldShellProps, 'label' | 'hint' | 'error' | 'action' | 'optional'> & { fieldClassName?: string }

export function PublicInput({
  id,
  label,
  hint,
  error,
  action,
  optional,
  required,
  className,
  fieldClassName,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & Shared) {
  const fallbackId = useId()
  const inputId = id ?? props.name ?? fallbackId

  return (
    <PublicFieldShell
      id={inputId}
      label={label}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      action={action}
      className={fieldClassName}
    >
      <input
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(control, boxed, error && invalid, className)}
        {...props}
      />
    </PublicFieldShell>
  )
}

export const PublicSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & Shared & { children: ReactNode }
>(function PublicSelect(
  {
    id,
    label,
    hint,
    error,
    action,
    optional,
    required,
    className,
    fieldClassName,
    children,
    value,
    defaultValue,
    onChange,
    onBlur,
    name,
    disabled,
    ...props
  },
  ref,
) {
  const fallbackId = useId()
  const selectId = id ?? name ?? fallbackId

  return (
    <PublicFieldShell
      id={selectId}
      label={label}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      action={action}
      className={fieldClassName}
    >
      <SearchableSelect
        ref={ref}
        id={selectId}
        name={name}
        options={optionsFromChildren(children)}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        error={Boolean(error)}
        tone="public"
        className={className}
        aria-label={props['aria-label']}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
      />
    </PublicFieldShell>
  )
})

export function PublicTextarea({
  id,
  label,
  hint,
  error,
  action,
  optional,
  required,
  className,
  fieldClassName,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & Shared) {
  const fallbackId = useId()
  const textareaId = id ?? props.name ?? fallbackId

  return (
    <PublicFieldShell
      id={textareaId}
      label={label}
      required={required}
      optional={optional}
      hint={hint}
      error={error}
      action={action}
      className={fieldClassName}
    >
      <textarea
        id={textareaId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        className={cn(control, 'w-full resize-none px-3.5 py-3 leading-relaxed', error && invalid, className)}
        {...props}
      />
    </PublicFieldShell>
  )
}

export function PublicSubmit({
  children,
  className,
  disabled,
  withArrow = true,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { withArrow?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={cn(
        'inline-flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-[#004ac6]',
        'px-8 text-base font-semibold text-white shadow-[0_10px_24px_rgba(0,74,198,0.25)] transition-colors',
        'hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
      {withArrow ? <ArrowRight className="h-[18px] w-[18px]" /> : null}
    </button>
  )
}

export { control as publicControlClass }
