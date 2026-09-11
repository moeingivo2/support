import { useEffect } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, Loader2, Send } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { HttpApiError } from '@/shared/api/http'
import { shiftReportSchema } from '../schemas/shiftReportSchema'
import type {
  ShiftReportFormInput,
  ShiftReportFormValues,
} from '../schemas/shiftReportSchema'

const formFields = [
  'responded_students_count',
  'unsatisfied_students_count',
  'desk_requests_count',
  'calls_count',
  'extra_notes',
] as const

type FormField = (typeof formFields)[number]

const serverFieldMessages: Record<FormField, string> = {
  responded_students_count: 'تعداد دانشجویان پاسخ‌داده‌شده باید صفر یا بیشتر باشد.',
  unsatisfied_students_count: 'تعداد دانشجویان ناراضی باید صفر یا بیشتر باشد.',
  desk_requests_count: 'تعداد درخواست‌های میز باید صفر یا بیشتر باشد.',
  calls_count: 'تعداد تماس‌ها باید صفر یا بیشتر باشد.',
  extra_notes: 'یادداشت‌های اضافی را بررسی کنید.',
}

type EndShiftReportFormProps = {
  disabled: boolean
  submitError: Error | null
  onSubmit: (values: ShiftReportFormValues) => Promise<void>
  onCancel: () => void
}

export function EndShiftReportForm({
  disabled,
  onCancel,
  onSubmit,
  submitError,
}: EndShiftReportFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<ShiftReportFormInput, unknown, ShiftReportFormValues>({
    defaultValues: {
      responded_students_count: '',
      unsatisfied_students_count: '',
      desk_requests_count: '',
      calls_count: '',
      extra_notes: '',
    },
    mode: 'onSubmit',
    resolver: zodResolver(shiftReportSchema),
  })

  const fieldsDisabled = disabled || isSubmitting

  useEffect(() => {
    if (!(submitError instanceof HttpApiError) || !submitError.fieldErrors) {
      return
    }

    for (const field of Object.keys(submitError.fieldErrors)) {
      if (isFormField(field)) {
        setError(field, { type: 'server', message: serverFieldMessages[field] })
      }
    }
  }, [setError, submitError])

  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
          <ClipboardList className="size-5" />
        </span>
        <h2 className="text-xl font-bold text-white">گزارش فعالیت شیفت</h2>
      </div>

      <form
        id="end-shift-report-form"
        className="mt-6"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <CountField
            disabled={fieldsDisabled}
            error={errors.responded_students_count?.message}
            label="تعداد دانشجویان پاسخ‌داده‌شده"
            placeholder="تعداد دانشجویانی که پاسخ داده‌اید"
            {...register('responded_students_count')}
          />
          <CountField
            disabled={fieldsDisabled}
            error={errors.unsatisfied_students_count?.message}
            label="تعداد دانشجویان ناراضی"
            placeholder="تعداد دانشجویان ناراضی"
            {...register('unsatisfied_students_count')}
          />
          <CountField
            disabled={fieldsDisabled}
            error={errors.desk_requests_count?.message}
            label="تعداد درخواست‌های میز"
            placeholder="درخواست‌های ثبت‌شده"
            {...register('desk_requests_count')}
          />
          <CountField
            disabled={fieldsDisabled}
            error={errors.calls_count?.message}
            label="تعداد تماس‌ها"
            placeholder="تماس‌های پاسخ‌داده‌شده"
            {...register('calls_count')}
          />

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="extra_notes">یادداشت‌های اضافی</Label>
            <Textarea
              id="extra_notes"
              placeholder="اگر نکته یا توضیحی درباره این شیفت وجود دارد، اینجا بنویسید."
              disabled={fieldsDisabled}
              {...register('extra_notes')}
            />
            {errors.extra_notes ? (
              <p className="text-xs font-medium text-err-text">{errors.extra_notes.message}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={fieldsDisabled} className="w-full sm:w-auto">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
            {isSubmitting ? 'در حال ثبت...' : 'ثبت گزارش پایان شیفت'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={fieldsDisabled}
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            انصراف
          </Button>
        </div>
      </form>
    </Card>
  )
}

type CountFieldProps = {
  disabled: boolean
  error?: string
  label: string
  name: 'responded_students_count' | 'unsatisfied_students_count' | 'desk_requests_count' | 'calls_count'
  placeholder: string
} & Pick<UseFormRegisterReturn, 'onChange' | 'onBlur' | 'name' | 'ref'>

function CountField({
  disabled,
  error,
  label,
  name,
  placeholder,
  ...inputProps
}: CountFieldProps) {
  const fieldId = `shift-report-${name}`

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9۰-۹٠-٩]*"
        dir="ltr"
        className="text-right"
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs font-medium text-err-text">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function isFormField(field: string): field is FormField {
  return formFields.includes(field as FormField)
}
