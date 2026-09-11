import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CalendarClock, Play, RefreshCw, Square } from 'lucide-react'
import { endShift, shiftServiceKeys, startShift } from '../services/shift-service'
import { useMyShifts } from '../hooks/useMyShifts'
import { startShiftSchema, type StartShiftFormValues } from '../schemas/startShiftSchema'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import { HttpApiError } from '@/shared/api/http'
import { formatShiftDateTime } from '../utils/formatShiftDateTime'
import { formatShiftDuration } from '../utils/formatShiftDuration'
import { getPages, PageButton } from '@/shared/ui/pagination'

const CHANNEL_OPTIONS = [
  { value: 'web', label: 'وب' },
  { value: 'ai', label: 'هوش مصنوعی' },
  { value: 'phone', label: 'تلفنی' },
] as const

export default function SupportShiftsPage() {
  const [page, setPage] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const shiftsQuery = useMyShifts(page)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<StartShiftFormValues>({
    defaultValues: { channel: 'web' },
    resolver: zodResolver(startShiftSchema),
  })

  const startMutation = useMutation({
    mutationFn: (payload: StartShiftFormValues) => startShift(payload),
    onSuccess: async (data) => {
      setSuccessMessage(data.message ?? 'شیفت با موفقیت شروع شد.')
      setServerError(null)
      await queryClient.invalidateQueries({ queryKey: shiftServiceKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['current-shift'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      setSuccessMessage(null)
      if (error instanceof HttpApiError && error.fieldErrors?.channel) {
        setError('channel', { type: 'server', message: error.fieldErrors.channel[0] })
      } else {
        setServerError(error instanceof Error ? error.message : 'شروع شیفت ناموفق بود.')
      }
    },
  })

  const endMutation = useMutation({
    mutationFn: (shiftId: number) => endShift(shiftId),
    onSuccess: async (data) => {
      setSuccessMessage(data.message ?? 'شیفت با موفقیت پایان یافت.')
      setServerError(null)
      await queryClient.invalidateQueries({ queryKey: shiftServiceKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['current-shift'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      setSuccessMessage(null)
      setServerError(error instanceof Error ? error.message : 'پایان شیفت ناموفق بود.')
    },
  })

  const shifts = shiftsQuery.data?.data ?? []
  const activeShift = shifts.find((shift) => shift.status === 'active')
  const pagination = shiftsQuery.data

  const onSubmit = async (values: StartShiftFormValues) => {
    setSuccessMessage(null)
    await startMutation.mutateAsync(values)
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">شیفت من</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          شروع و پایان شیفت پاسخگویی خود را مدیریت کنید و سابقه شیفت‌ها را ببینید.
        </p>
      </Card>

      {serverError ? (
        <Alert tone="danger" className="flex items-center justify-between gap-3">
          <span>{serverError}</span>
          <Button variant="ghost" size="icon" aria-label="بستن" onClick={() => setServerError(null)}>
            <RefreshCw className="hidden" />
            <AlertCircle className="hidden" />
            ✕
          </Button>
        </Alert>
      ) : null}
      {successMessage ? <Alert tone="success">{successMessage}</Alert> : null}

      {activeShift ? (
        <Card className="border-succ-txt/20 bg-succ-btn/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <StatusPill tone="success">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-current" />
                شیفت فعال
              </StatusPill>
              <p className="text-sm text-zinc-300">
                شروع: {formatShiftDateTime(activeShift.start_time)} — کانال:{' '}
                {formatChannel(activeShift.channel)}
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => endMutation.mutate(activeShift.id)}
              disabled={endMutation.isPending}
            >
              <Square />
              {endMutation.isPending ? 'در حال پایان...' : 'پایان شیفت'}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
              <Play className="size-5" />
            </span>
            <h2 className="text-xl font-bold text-white">شروع شیفت جدید</h2>
          </div>

          <form className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="flex-1 space-y-2">
              <Label htmlFor="channel">کانال پاسخگویی</Label>
              <select
                id="channel"
                className="h-11 w-full rounded-2xl border border-border/15 bg-white/5 px-4 text-sm text-zinc-100 outline-none transition focus-visible:border-active-blue/50 focus-visible:ring-2 focus-visible:ring-active-blue/30 disabled:cursor-not-allowed disabled:opacity-50"
                {...register('channel')}
              >
                {CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.channel ? (
                <p className="text-xs font-medium text-err-text">{errors.channel.message}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <Play />
              {isSubmitting ? 'در حال شروع...' : 'شروع شیفت'}
            </Button>
          </form>
        </Card>
      )}

      <section className="space-y-4" aria-label="سابقه شیفت‌ها">
        <h2 className="text-xl font-bold text-white">سابقه شیفت‌ها</h2>

        {shiftsQuery.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Card key={index} className="p-5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-4 w-64" />
              </Card>
            ))}
          </div>
        ) : shiftsQuery.isError ? (
          <Alert tone="danger">
            دریافت سابقه شیفت‌ها ناموفق بود. دوباره تلاش کنید.
          </Alert>
        ) : shifts.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <CalendarClock className="size-10 text-zinc-600" />
            <p className="text-base font-bold text-white">هنوز شیفت‌ای ثبت نشده است.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <Card key={shift.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <CalendarClock className="size-4 text-zinc-500" />
                    {formatShiftDateTime(shift.start_time)}
                  </span>
                  <StatusPill tone={shift.status === 'active' ? 'success' : 'neutral'}>
                    {shift.status === 'active' ? 'فعال' : 'پایان‌یافته'}
                  </StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
                  <span>کانال: {formatChannel(shift.channel)}</span>
                  <span>پایان: {shift.end_time ? formatShiftDateTime(shift.end_time) : '—'}</span>
                  <span>مدت: {formatShiftDuration(shift.start_time, shift.end_time)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {pagination && pagination.last_page > 1 ? (
          <div className="flex items-center justify-center gap-2">
            <PageButton
              disabled={!pagination.prev_page_url}
              onClick={() => setPage(pagination.current_page - 1)}
              aria-label="صفحه قبل"
            >
              ›
            </PageButton>
            {getPages(pagination.current_page, pagination.last_page).map((p, index) =>
              p === null ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-zinc-600">
                  …
                </span>
              ) : (
                <PageButton key={p} active={p === pagination.current_page} onClick={() => setPage(p)}>
                  {p.toLocaleString('fa-IR')}
                </PageButton>
              ),
            )}
            <PageButton
              disabled={!pagination.next_page_url}
              onClick={() => setPage(pagination.current_page + 1)}
              aria-label="صفحه بعد"
            >
              ‹
            </PageButton>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function formatChannel(channel: string): string {
  const labels: Record<string, string> = {
    web: 'وب',
    ai: 'هوش مصنوعی',
    phone: 'تلفنی',
  }
  return labels[channel] ?? 'نامشخص'
}
