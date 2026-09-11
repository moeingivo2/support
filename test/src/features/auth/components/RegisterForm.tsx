import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, UserPlus } from 'lucide-react'
import { useAuth } from '@/shared/services/auth-context'
import { HttpApiError } from '@/shared/api/http'
import { z } from 'zod'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'نام و نام خانوادگی الزامی است.').max(255),
    phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))
      .refine((value) => /^09\d{9}$/.test(value), 'شماره موبایل معتبر وارد کنید (مثلاً 09123456789).'),
    password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.').max(190),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'تکرار رمز عبور مطابقت ندارد.',
    path: ['password_confirmation'],
  })

type RegisterFormValues = z.output<typeof registerSchema>
type RegisterFormInput = z.input<typeof registerSchema>

type RegisterFormProps = {
  onBackToLogin: () => void
  onRegistered: () => void
}

export function RegisterForm({ onBackToLogin, onRegistered }: RegisterFormProps) {
  const { register: registerAccount } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    defaultValues: { name: '', phone: '', password: '', password_confirmation: '' },
    mode: 'onSubmit',
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null)
    try {
      await registerAccount({
        name: values.name,
        phone: values.phone,
        password: values.password,
        password_confirmation: values.password_confirmation,
      })
      onRegistered()
    } catch (error) {
      if (error instanceof HttpApiError && error.fieldErrors) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (isFormPasswordField(field)) {
            setError(field, { type: 'server', message: messages[0] })
          } else {
            setServerError(messages[0] ?? error.message)
          }
        }
      } else {
        setServerError(error instanceof Error ? error.message : 'ثبت‌نام ناموفق بود.')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-deactive-btn-gray px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-3xl bg-active-blue text-xl font-black text-white">
            A
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">ثبت‌نام پشتیبان</h1>
            <p className="mt-1 text-sm text-zinc-500">حساب کاربری پشتیبان جدید بسازید.</p>
          </div>
        </div>

        <Card className="p-6 md:p-7">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

            <div className="space-y-2">
              <Label htmlFor="name">نام و نام خانوادگی</Label>
              <Input
                id="name"
                autoComplete="name"
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
                autoComplete="tel"
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
              <Label htmlFor="password_confirmation">تکرار رمز عبور</Label>
              <Input
                id="password_confirmation"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password_confirmation)}
                {...register('password_confirmation')}
              />
              {errors.password_confirmation ? (
                <p className="text-xs font-medium text-err-text">
                  {errors.password_confirmation.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />}
              {isSubmitting ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
            </Button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-active-blue"
            >
              <ArrowRight className="size-4" />
              قبلاً ثبت‌نام کرده‌اید؟ بازگشت به ورود
            </button>
          </form>
        </Card>
      </div>
    </div>
  )
}

function isFormPasswordField(field: string): field is 'phone' {
  return field === 'phone'
}
