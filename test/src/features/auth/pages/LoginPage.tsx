import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/shared/services/auth-context'
import { HttpApiError } from '@/shared/api/http'
import { loginSchema, type LoginFormInput, type LoginFormValues } from '../schemas/loginSchema'
import { Logo } from '@/shared/api/logo'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    defaultValues: { login: '', password: '' },
    mode: 'onSubmit',
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    try {
      await login(values.login, values.password)
      navigate('/', { replace: true })
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
    <div className="flex min-h-screen items-center justify-center bg-deactive-btn-gray px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <div>
            <h1 className="text-2xl font-bold text-white">پنل پشتیبانی AIO</h1>
            <p className="mt-1 text-sm text-zinc-500">برای ادامه وارد حساب کاربری خود شوید.</p>
          </div>
        </div>

        <Card className="p-6 md:p-7">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

            <div className="space-y-2">
              <Label htmlFor="login">شماره تلفن یا ایمیل</Label>
              <Input
                id="login"
                dir="ltr"
                autoComplete="username"
                placeholder="09123456789 یا admin@example.com"
                aria-invalid={Boolean(errors.login)}
                {...register('login')}
              />
              {errors.login ? (
                <p className="text-xs font-medium text-err-text">{errors.login.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
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
              {isSubmitting ? 'در حال ورود...' : 'ورود به پنل'}
            </Button>
          </form>
        </Card>

        <div className="flex flex-col items-center gap-2 text-xs text-zinc-600">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <span>اطلاعات ورود شما به‌صورت امن منتقل می‌شود.</span>
          </span>
          <span>ثبت پشتیبان جدید فقط توسط مدیر سیستم انجام می‌شود.</span>
        </div>
      </div>
    </div>
  )
}
