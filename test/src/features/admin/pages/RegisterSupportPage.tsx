import { useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Globe, Loader2, Send, Sparkles, UserPlus } from 'lucide-react'
import {
  adminKeys,
  createSupport,
  getSupports,
} from '../services/admin-service'
import {
  createSupportSchema,
  type CreateSupportFormInput,
  type CreateSupportFormValues,
} from '../schemas/createSupportSchema'
import { HttpApiError } from '@/shared/api/http'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/utils'

export default function RegisterSupportPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()
  const supportsQuery = useQuery({ queryKey: adminKeys.supports, queryFn: getSupports })

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    reset,
    watch,
  } = useForm<CreateSupportFormInput, unknown, CreateSupportFormValues>({
    defaultValues: { name: '', phone: '', password: '', support_type: 'web' },
    mode: 'onSubmit',
    resolver: zodResolver(createSupportSchema),
  })

  const selectedType = watch('support_type')

  const onSubmit = async (values: CreateSupportFormValues) => {
    setServerError(null)
    setSuccessMessage(null)
    try {
      const response = await createSupport(values)
      setSuccessMessage(`${response.message} — ${values.name}`)
      toast.success(`${values.name} ثبت شد.`)
      reset()
      await queryClient.invalidateQueries({ queryKey: adminKeys.supports })
    } catch (error) {
      if (error instanceof HttpApiError && error.fieldErrors) {
        const fieldMessages = Object.values(error.fieldErrors).flat()
        setServerError(fieldMessages[0] ?? error.message)
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (isFormField(field)) {
            setError(field, { type: 'server', message: messages[0] })
          }
        }
      } else {
        setServerError(error instanceof Error ? error.message : 'ثبت پشتیبان ناموفق بود.')
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">ثبت پشتیبان جدید</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          حساب پشتیبان جدید بسازید و نوع پشتیبانی (وب یا هوش مصنوعی) او را تعیین کنید. این نوع
          برای همیشه روی پشتیبان می‌ماند و کانال شیفت‌های او را مشخص می‌کند.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
              <UserPlus className="size-5" />
            </span>
            <h2 className="text-xl font-bold text-white">ایجاد حساب پشتیبان</h2>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
            {successMessage ? <Alert tone="success">{successMessage}</Alert> : null}

            <div className="space-y-2">
              <Label htmlFor="name">نام و نام خانوادگی</Label>
              <Input
                id="name"
                autoComplete="off"
                placeholder="مثلاً سارا محمدی"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name ? (
                <p className="text-xs font-medium text-err-text">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">شماره موبایل</Label>
              <Input
                id="phone"
                dir="ltr"
                inputMode="tel"
                placeholder="09123456789"
                aria-invalid={Boolean(errors.phone)}
                {...register('phone')}
              />
              {errors.phone ? (
                <p className="text-xs font-medium text-err-text">{errors.phone.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                placeholder="حداقل ۸ کاراکتر"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-xs font-medium text-err-text">{errors.password.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>نوع پشتیبانی</Label>
              <div className="grid grid-cols-2 gap-3">
                <TypeOption
                  active={selectedType === 'web'}
                  icon={<Globe className="size-5" />}
                  label="پشتیبان وب"
                  hint="پاسخگویی چت وب"
                  inputProps={register('support_type')}
                  value="web"
                />
                <TypeOption
                  active={selectedType === 'ai'}
                  icon={<Sparkles className="size-5" />}
                  label="پشتیبان هوش مصنوعی"
                  hint="پاسخگویی دستیار AI"
                  inputProps={register('support_type')}
                  value="ai"
                />
              </div>
              {errors.support_type ? (
                <p className="text-xs font-medium text-err-text">{errors.support_type.message}</p>
              ) : null}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
              {isSubmitting ? 'در حال ثبت...' : 'ثبت پشتیبان'}
            </Button>
          </form>
        </Card>

        <Card className="p-6 md:p-7">
          <h2 className="text-xl font-bold text-white">پشتیبان‌های فعلی</h2>
          <p className="mt-2 text-sm text-zinc-400">فهرست پشتیبان‌های ثبت‌شده تیم</p>

          <div className="mt-5 space-y-3">
            {supportsQuery.isPending ? (
              Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-3xl" />
              ))
            ) : supportsQuery.isError ? (
              <Alert tone="danger">دریافت فهرست پشتیبان‌ها ناموفق بود.</Alert>
            ) : (supportsQuery.data?.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">
                هنوز پشتیبانی ثبت نشده است.
              </p>
            ) : (
              (supportsQuery.data?.data ?? []).map((support) => (
                <div
                  key={support.id}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-border/10 bg-white/5 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-100">{support.name}</p>
                    <p dir="ltr" className="text-right text-xs text-zinc-500">
                      {support.phone}
                    </p>
                  </div>
                  <StatusPill tone={support.support_type === 'ai' ? 'warning' : 'info'}>
                    {support.support_type === 'ai' ? (
                      <Sparkles className="size-3" />
                    ) : (
                      <Globe className="size-3" />
                    )}
                    {support.support_type === 'ai' ? 'هوش مصنوعی' : 'وب'}
                  </StatusPill>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

type TypeOptionProps = {
  active: boolean
  icon: React.ReactNode
  label: string
  hint: string
  value: string
  inputProps: UseFormRegisterReturn
}

function TypeOption({ active, hint, icon, inputProps, label, value }: TypeOptionProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col gap-2 rounded-3xl border p-4 transition',
        active
          ? 'border-active-blue/50 bg-active-blue/10 ring-2 ring-active-blue/30'
          : 'border-border/15 bg-white/5 hover:bg-white/10',
      )}
    >
      <input type="radio" value={value} className="sr-only" {...inputProps} />
      <span className={cn('flex items-center gap-2', active ? 'text-active-blue' : 'text-zinc-300')}>
        {icon}
        {active ? <CheckCircle2 className="size-4" /> : null}
      </span>
      <span className={cn('text-sm font-bold', active ? 'text-white' : 'text-zinc-200')}>
        {label}
      </span>
      <span className="text-xs text-zinc-500">{hint}</span>
    </label>
  )
}

function isFormField(field: string): field is 'name' | 'phone' | 'password' | 'support_type' {
  return ['name', 'phone', 'password', 'support_type'].includes(field)
}
