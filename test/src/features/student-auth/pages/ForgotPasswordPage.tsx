import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { HttpApiError, postJson } from '@/shared/api/http'
import { Logo } from '@/shared/api/logo'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'ایمیل را وارد کنید.')
    .email('قالب ایمیل معتبر نیست.')
    .max(190, 'مقدار وارد شده بیش از حد طولانی است.'),
})

type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>
type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sentMessage, setSentMessage] = useState<string | null>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordInput, unknown, ForgotPasswordValues>({
    defaultValues: { email: '' },
    mode: 'onSubmit',
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (values: ForgotPasswordValues) => {
    setServerError(null)
    setSentMessage(null)
    try {
      const response = await postJson<{ email: string }, { message: string }>(
        '/api/password/forgot',
        { email: values.email },
      )
      setSentMessage(response.message)
    } catch (error) {
      setServerError(error instanceof HttpApiError ? error.message : 'ثبت درخواست ناموفق بود.')
    }
  }

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deactive-btn-gray px-4 py-10"
    >
      <div className="pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full bg-active-blue/20 blur-3xl" />

      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={54} />
          <h1 className="text-2xl font-bold text-white">بازیابی رمز عبور</h1>
          <p className="text-sm text-zinc-500">
            ایمیلی که با آن ثبت‌نام کرده‌اید را وارد کنید تا درخواست شما ثبت شود.
          </p>
        </div>

        <Card className="p-6 md:p-7">
          {sentMessage ? (
            <div className="space-y-5 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-succ-btn text-succ-txt">
                <CheckCircle2 className="size-7" />
              </span>
              <p className="text-sm leading-7 text-zinc-300">{sentMessage}</p>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">
                  <ArrowRight />
                  بازگشت به صفحه ورود
                </Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

              <div className="space-y-2">
                <Label htmlFor="forgot-email">ایمیل</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    id="forgot-email"
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Mail />}
                {isSubmitting ? 'در حال ثبت درخواست...' : 'ثبت درخواست بازیابی'}
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-xs text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline"
          >
            <ArrowRight className="size-3" />
            بازگشت به صفحه ورود
          </Link>
        </p>
      </div>
    </div>
  )
}
