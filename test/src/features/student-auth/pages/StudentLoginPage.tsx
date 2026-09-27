import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/shared/services/auth-context'
import { HttpApiError } from '@/shared/api/http'
import { Logo } from '@/shared/api/logo'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  studentLoginSchema,
  type StudentLoginFormInput,
  type StudentLoginFormValues,
} from '../schemas/studentLoginSchema'

export default function StudentLoginPage() {
  const navigate = useNavigate()
  const { login, logout } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<StudentLoginFormInput, unknown, StudentLoginFormValues>({
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    resolver: zodResolver(studentLoginSchema),
  })

  const onSubmit = async (values: StudentLoginFormValues) => {
    setServerError(null)
    try {
      const user = await login(values.email, values.password)

      if (user.role !== 'student') {
        logout()
        setServerError('این حساب کاربری متعلق به پنل پشتیبانی است. از صفحه ورود پنل استفاده کنید.')
        return
      }

      navigate('/chat', { replace: true })
    } catch (error) {
      if (error instanceof HttpApiError && error.fieldErrors) {
        const fieldMessages = Object.values(error.fieldErrors).flat()
        setServerError(fieldMessages[0] ?? error.message)
      } else {
        setServerError(error instanceof Error ? error.message : 'ورود ناموفق بود.')
      }
    }
  }

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deactive-btn-gray px-4 py-10"
    >
      <div className="pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full bg-active-blue/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-alret-gold/10 blur-3xl" />

      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={58} />
          <div>
            <h1 className="text-2xl font-bold text-white">ورود به aiosupport</h1>
            <p className="mt-1 text-sm text-zinc-500">
              برای گفتگو با پشتیبانی و مشاهده وضعیت دوره وارد شوید.
            </p>
          </div>
        </div>

        <Card className="p-6 md:p-7">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

            <div className="space-y-2">
              <Label htmlFor="student-email">ایمیل</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="student-email"
                  dir="ltr"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="pr-11 text-right"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <p className="text-xs font-medium text-err-text">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="student-password">رمز عبور</Label>
                <Link
                  to="/forgot-password"
                  className="rounded-md text-xs font-semibold text-active-blue underline-offset-4 transition-colors hover:text-alret-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/60"
                >
                  فراموشی رمز عبور
                </Link>
              </div>
              <Input
                id="student-password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password ? (
                <p className="text-xs font-medium text-err-text">{errors.password.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />}
              {isSubmitting ? 'در حال ورود...' : 'ورود'}
            </Button>
          </form>
        </Card>

        <div className="space-y-3 text-center">
          <p className="text-sm text-zinc-400">
            حساب کاربری ندارید؟{' '}
            <Link
              to="/register"
              className="font-bold text-active-blue underline-offset-4 transition-colors hover:text-alret-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/60"
            >
              ثبت‌نام کنید
            </Link>
          </p>
          <p className="flex items-center justify-center gap-2 text-xs text-zinc-600">
            <ShieldCheck className="size-4" />
            <span>اطلاعات ورود شما به‌صورت امن منتقل می‌شود.</span>
          </p>
          <Link
            to="/panel-login"
            className="inline-block text-xs text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline"
          >
            ورود به پنل پشتیبانی
          </Link>
        </div>
      </div>
    </div>
  )
}
