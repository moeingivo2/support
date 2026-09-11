import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { FAQ_CATEGORIES } from '../services/faq-service'
import type { Faq } from '../types/faq'

type FaqFormValues = {
  question: string
  answer: string
  category: string
}

type FaqFormDialogProps = {
  open: boolean
  faq: Faq | null
  isSubmitting?: boolean
  fieldErrors?: Record<string, string[]>
  onSubmit: (values: FaqFormValues) => void
  onClose: () => void
}

export function FaqFormDialog({
  open,
  faq,
  isSubmitting = false,
  fieldErrors,
  onSubmit,
  onClose,
}: FaqFormDialogProps) {
  const [values, setValues] = useState<FaqFormValues>(() => getInitialValues(faq ?? null))

  const categoryOptions = getCategoryOptions(faq ?? null)

  function setField<Key extends keyof FaqFormValues>(key: Key, value: FaqFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit({
      question: values.question.trim(),
      answer: values.answer.trim(),
      category: values.category.trim(),
    })
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 space-y-6 overflow-y-auto rounded-4xl border border-border/10 bg-deactive-btn-gray p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-xl font-bold text-white">
                {faq ? 'ویرایش سوال متداول' : 'افزودن سوال متداول'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-zinc-400">
                {faq ? 'مشخصات این سوال را ویرایش کنید.' : 'سوال و پاسخ جدیدی را ثبت کنید.'}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="بستن">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="faq-question">سوال</Label>
              <Input
                id="faq-question"
                value={values.question}
                onChange={(event) => setField('question', event.target.value)}
                placeholder="سوال پرتکرار دانشجویان…"
              />
              {fieldError('question', fieldErrors) ? (
                <p className="text-xs font-medium text-err-text">
                  {fieldError('question', fieldErrors)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq-answer">پاسخ</Label>
              <Textarea
                id="faq-answer"
                value={values.answer}
                onChange={(event) => setField('answer', event.target.value)}
                placeholder="پاسخ کامل که برای دانشجو ارسال می‌شود…"
                className="min-h-44"
              />
              {fieldError('answer', fieldErrors) ? (
                <p className="text-xs font-medium text-err-text">
                  {fieldError('answer', fieldErrors)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq-category">دسته‌بندی</Label>
              <select
                id="faq-category"
                className="h-11 w-full rounded-2xl border border-border/15 bg-white/5 px-4 text-sm text-zinc-100 outline-none transition focus-visible:border-active-blue/50 focus-visible:ring-2 focus-visible:ring-active-blue/30"
                value={values.category}
                onChange={(event) => setField('category', event.target.value)}
              >
                <option value="">بدون دسته</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                انصراف
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'در حال ثبت...' : faq ? 'ذخیره تغییرات' : 'افزودن'}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function getInitialValues(faq: Faq | null): FaqFormValues {
  return {
    question: faq?.question ?? '',
    answer: faq?.answer ?? '',
    category: faq?.category ?? '',
  }
}

function getCategoryOptions(faq: Faq | null): Array<{ value: string; label: string }> {
  const options = [...FAQ_CATEGORIES]
  if (faq?.category && !options.some((item) => item.value === faq.category)) {
    options.push({ value: faq.category, label: faq.category })
  }
  return options
}

function fieldError(field: string, fieldErrors?: Record<string, string[]>): string | undefined {
  return fieldErrors?.[field]?.[0]
}