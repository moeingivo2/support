import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Check, GraduationCap, Loader2, School, UserRound, Wifi } from 'lucide-react'
import { useAuth } from '@/shared/services/auth-context'
import { HttpApiError } from '@/shared/api/http'
import { Logo } from '@/shared/api/logo'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/lib/utils'
import {
  studentRegisterSchema,
  type StudentRegisterFormInput,
  type StudentRegisterFormValues,
} from '../schemas/studentRegisterSchema'
import { COURSE_OPTIONS, TOTAL_SESSIONS, TRACK_OPTIONS } from '../constants/courses'

type RegisterMode = 'account' | 'course'

/** فیلدهایی که در مرحله انتخاب دوره هستند و باید پیام خطا همان‌جا دیده شود */
const COURSE_FIELDS = new Set(['course', 'track', 'sessions'])

const COURSE_ICONS = {
  offline: Wifi,
  in_person: UserRound,
  school: School,
} as const

export default function StudentRegisterPage() {
  const navigate = useNavigate()
  const { registerStudentAccount } = useAuth()
  const [mode, setMode] = useState<RegisterMode>('account')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setValue,
    watch,
    trigger,
  } = useForm<StudentRegisterFormInput, unknown, StudentRegisterFormValues>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      password_confirmation: '',
      course: 'offline',
      track: null,
      sessions: [],
    },
    mode: 'onSubmit',
    resolver: zodResolver(studentRegisterSchema),
  })

  const course = watch('course')
  const track = watch('track')
  const sessions = watch('sessions') ?? []

  const goToCourseStep = async () => {
    const valid = await trigger(['first_name', 'last_name', 'email', 'password', 'password_confirmation'])
    if (valid) setMode('course')
  }

  const onSubmit = async (values: StudentRegisterFormValues) => {
    setServerError(null)

    const isOffline = values.course === 'offline'

    try {
      await registerStudentAccount({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
        course: values.course,
        track: isOffline ? (values.track ?? null) : null,
        sessions: isOffline ? values.sessions : [],
      })
      navigate('/chat', { replace: true })
    } catch (error) {
      if (error instanceof HttpApiError && error.fieldErrors) {
        const fields = Object.keys(error.fieldErrors)
        const fieldMessages = Object.values(error.fieldErrors).flat()
        setServerError(fieldMessages[0] ?? error.message)

        // خطای مربوط به دوره باید کنار انتخاب دوره دیده شود، نه در مرحله حساب
        if (fields.some((field) => COURSE_FIELDS.has(field))) {
          setMode('course')
        } else if (fieldMessages.length > 0) {
          setMode('account')
        }
      } else {
        setServerError(error instanceof Error ? error.message : 'ثبت‌نام ناموفق بود.')
      }
    }
  }

  function toggleSession(session: number) {
    const next = sessions.includes(session)
      ? sessions.filter((item) => item !== session)
      : [...sessions, session]
    setValue('sessions', next, { shouldValidate: true })
  }

  return (
    <div
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deactive-btn-gray px-4 py-10"
    >
      <div className="pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full bg-active-blue/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-alret-gold/10 blur-3xl" />

      <div className="relative w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={58} />
          <div>
            <h1 className="text-2xl font-bold text-white">ثبت‌نام در aiosupport</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === 'account'
                ? 'مرحله اول: اطلاعات حساب کاربری خود را وارد کنید.'
                : 'مرحله دوم: دوره‌ای که خریداری کرده‌اید را انتخاب کنید.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2" aria-hidden="true">
          <StepBadge label="اطلاعات حساب" active={mode === 'account'} done={mode === 'course'} />
          <span className="h-px w-10 bg-white/15" />
          <StepBadge label="انتخاب دوره" active={mode === 'course'} done={false} />
        </div>

        <Card className="p-6 md:p-7">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

            <div className={cn('space-y-5', mode === 'course' && 'hidden')}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">نام</Label>
                  <Input
                    id="first_name"
                    autoComplete="given-name"
                    placeholder="مثلاً زهرا"
                    aria-invalid={Boolean(errors.first_name)}
                    {...register('first_name')}
                  />
                  {errors.first_name ? (
                    <p className="text-xs font-medium text-err-text">{errors.first_name.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">نام خانوادگی</Label>
                  <Input
                    id="last_name"
                    autoComplete="family-name"
                    placeholder="مثلاً کریمی"
                    aria-invalid={Boolean(errors.last_name)}
                    {...register('last_name')}
                  />
                  {errors.last_name ? (
                    <p className="text-xs font-medium text-err-text">{errors.last_name.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">ایمیل</Label>
                <Input
                  id="register-email"
                  dir="ltr"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="text-right"
                  aria-invalid={Boolean(errors.email)}
                  {...register('email')}
                />
                {errors.email ? (
                  <p className="text-xs font-medium text-err-text">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="register-password">رمز عبور</Label>
                  <Input
                    id="register-password"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(errors.password)}
                    {...register('password')}
                  />
                  {errors.password ? (
                    <p className="text-xs font-medium text-err-text">{errors.password.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password-confirm">تکرار رمز عبور</Label>
                  <Input
                    id="register-password-confirm"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(errors.password_confirmation)}
                    {...register('password_confirmation')}
                  />
                  {errors.password_confirmation ? (
                    <p className="text-xs font-medium text-err-text">
                      {errors.password_confirmation.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <Button type="button" className="w-full" onClick={goToCourseStep}>
                <GraduationCap />
                ادامه: انتخاب دوره
              </Button>
            </div>

            <div className={cn('space-y-6', mode === 'account' && 'hidden')}>
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-semibold text-zinc-200">دوره</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {COURSE_OPTIONS.map((option) => {
                    const Icon = COURSE_ICONS[option.value]
                    const selected = course === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setValue('course', option.value, { shouldValidate: true })
                          if (option.value !== 'offline') {
                            setValue('track', null)
                            setValue('sessions', [])
                          }
                        }}
                        aria-pressed={selected}
                        className={cn(
                          'group flex flex-col items-start gap-2 rounded-3xl border p-4 text-right transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/70',
                          selected
                            ? 'border-active-blue/50 bg-active-blue/10 shadow-[0_14px_34px_-22px_rgba(0,98,255,.95)]'
                            : 'border-white/[.09] bg-white/[.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.07]',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-10 place-items-center rounded-2xl transition-colors',
                            selected ? 'bg-active-blue/20 text-active-blue' : 'bg-white/5 text-zinc-400',
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        <span className="text-sm font-bold text-white">{option.label}</span>
                        <span className="text-xs leading-5 text-zinc-500">{option.description}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.course ? (
                  <p className="text-xs font-medium text-err-text">{errors.course.message}</p>
                ) : null}
              </fieldset>

              {course === 'offline' ? (
                <div className="space-y-5 rounded-3xl border border-white/[.08] bg-black/15 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <span className="grid size-6 place-items-center rounded-full bg-active-blue/15 text-xs text-active-blue">
                      ۱
                    </span>
                    رشته دوره آفلاین را انتخاب کنید
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {TRACK_OPTIONS.map((option) => {
                      const selected = track === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setValue('track', option.value, { shouldValidate: true })}
                          aria-pressed={selected}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl border p-4 text-right transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/70',
                            selected
                              ? 'border-alret-gold/45 bg-alret-gold/10'
                              : 'border-white/[.09] bg-white/[.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.07]',
                          )}
                        >
                          <span
                            className={cn(
                              'grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
                              selected
                                ? 'border-alret-gold bg-alret-gold text-[#061329]'
                                : 'border-white/25 text-transparent',
                            )}
                          >
                            <Check className="size-3" />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-white">{option.label}</span>
                            <span className="block text-xs text-zinc-500">{option.description}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {errors.track ? (
                    <p className="text-xs font-medium text-err-text">{errors.track.message}</p>
                  ) : null}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                      <span className="grid size-6 place-items-center rounded-full bg-active-blue/15 text-xs text-active-blue">
                        ۲
                      </span>
                      جلسات خریداری‌شده را انتخاب کنید
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                      {Array.from({ length: TOTAL_SESSIONS }, (_, index) => index + 1).map((session) => {
                        const selected = sessions.includes(session)
                        return (
                          <button
                            key={session}
                            type="button"
                            onClick={() => toggleSession(session)}
                            aria-pressed={selected}
                            aria-label={`جلسه ${session}`}
                            className={cn(
                              'grid aspect-square place-items-center rounded-2xl border text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/70',
                              selected
                                ? 'border-active-blue/50 bg-active-blue/20 text-active-blue shadow-[0_10px_24px_-16px_rgba(0,98,255,.9)]'
                                : 'border-white/[.09] bg-white/[.03] text-zinc-400 hover:-translate-y-0.5 hover:border-white/25 hover:text-zinc-100',
                            )}
                          >
                            {session}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <button
                        type="button"
                        onClick={() => setValue('sessions', Array.from({ length: TOTAL_SESSIONS }, (_, i) => i + 1))}
                        className="rounded-md font-semibold text-active-blue underline-offset-4 transition-colors hover:text-alret-gold hover:underline"
                      >
                        انتخاب همه جلسات
                      </button>
                      <span>
                        {sessions.length} جلسه از {TOTAL_SESSIONS} جلسه انتخاب شده
                      </span>
                    </div>
                    {errors.sessions ? (
                      <p className="text-xs font-medium text-err-text">{errors.sessions.message}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <Alert tone="info">
                  برای دوره «{COURSE_OPTIONS.find((item) => item.value === course)?.label}» نیازی به انتخاب
                  رشته یا جلسه نیست.
                </Alert>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
                  {isSubmitting ? 'در حال ثبت‌نام...' : 'ثبت‌نام و ورود'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('account')}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  بازگشت به اطلاعات حساب
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <p className="text-center text-sm text-zinc-400">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link
            to="/login"
            className="font-bold text-active-blue underline-offset-4 transition-colors hover:text-alret-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/60"
          >
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  )
}

function StepBadge({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors duration-300',
        active && 'bg-active-blue/15 text-active-blue ring-active-blue/30',
        done && 'bg-succ-btn text-succ-txt ring-succ-txt/25',
        !active && !done && 'bg-white/5 text-zinc-500 ring-white/10',
      )}
    >
      {label}
    </span>
  )
}
