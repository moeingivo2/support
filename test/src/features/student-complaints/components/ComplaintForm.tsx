import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Send, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { createComplaint } from '../services/complaint-service'
import { complaintSchema, type ComplaintFormInput, type ComplaintFormValues } from '../schemas/complaintSchema'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'بالا' },
  { value: 'normal', label: 'متوسط' },
  { value: 'low', label: 'پایین' },
] as const

type ComplaintFormProps = {
  open: boolean
  onClose: () => void
  onCreated: (message: string) => void
  activeShiftId: number | null
}

export function ComplaintForm({ open, onClose, onCreated, activeShiftId }: ComplaintFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ComplaintFormInput, unknown, ComplaintFormValues>({
    defaultValues: {
      student_name: '',
      student_code: '',
      student_phone: '',
      mentor_name: '',
      mentor_phone: '',
      description: '',
      priority: 'normal',
    },
    mode: 'onSubmit',
    resolver: zodResolver(complaintSchema),
  })

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const onSubmit = async (values: ComplaintFormValues) => {
    const response = await createComplaint({
      student_name: values.student_name,
      student_code: values.student_code || null,
      student_phone: values.student_phone || null,
      mentor_name: values.mentor_name,
      mentor_phone: values.mentor_phone || null,
      description: values.description,
      priority: values.priority,
      shift_id: activeShiftId,
    })
    onCreated(response.message ?? 'نارضایتی با موفقیت ثبت شد.')
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 space-y-6 overflow-y-auto rounded-4xl border border-border/10 bg-deactive-btn-gray p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-bold text-white">
                ثبت نارضایتی دانشجو
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-zinc-400">
                مشکل یا نارضایتی دانشجو نسبت به منتور را ثبت کنید تا پیگیری شود.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="بستن فرم">
                <X />
              </Button>
            </Dialog.Close>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

              <Field label="نام دانشجو" error={errors.student_name?.message} htmlFor="student_name" required>
                <Input
                  id="student_name"
                  placeholder="مثلاً علی احمدی"
                  aria-invalid={Boolean(errors.student_name)}
                  {...register('student_name')}
                />
              </Field>
              <Field label="کد دانشجویی (اختیاری)" error={errors.student_code?.message} htmlFor="student_code">
                <Input
                  id="student_code"
                  dir="ltr"
                  placeholder="مثلاً 40122345"
                  {...register('student_code')}
                />
              </Field>
              <Field label="تلفن دانشجو (اختیاری)" error={errors.student_phone?.message} htmlFor="student_phone">
                <Input id="student_phone" dir="ltr" placeholder="09123456789" {...register('student_phone')} />
              </Field>
              <Field label="نام منتور" error={errors.mentor_name?.message} htmlFor="mentor_name" required>
                <Input
                  id="mentor_name"
                  placeholder="مثلاً رضا محمدی"
                  aria-invalid={Boolean(errors.mentor_name)}
                  {...register('mentor_name')}
                />
              </Field>
              <Field label="تلفن منتور (اختیاری)" error={errors.mentor_phone?.message} htmlFor="mentor_phone">
                <Input id="mentor_phone" dir="ltr" placeholder="09123456789" {...register('mentor_phone')} />
              </Field>
              <Field label="اولویت" error={errors.priority?.message} htmlFor="priority" required>
                <select
                  id="priority"
                  className="h-11 w-full rounded-2xl border border-border/15 bg-white/5 px-4 text-sm text-zinc-100 outline-none transition focus-visible:border-active-blue/50 focus-visible:ring-2 focus-visible:ring-active-blue/30"
                  {...register('priority')}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">توضیحات</Label>
              <Textarea
                id="description"
                placeholder="شرح مشکل دانشجو حداقل ۱۰ کاراکتر..."
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
              {errors.description ? (
                <p className="text-xs font-medium text-err-text">{errors.description.message}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                {isSubmitting ? 'در حال ثبت...' : 'ثبت نارضایتی'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                انصراف
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type FieldProps = {
  label: string
  error?: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, error, htmlFor, required, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-err-text"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-err-text">{error}</p> : null}
    </div>
  )
}
