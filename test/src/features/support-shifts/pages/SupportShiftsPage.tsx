import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CalendarClock, Play, RefreshCw, Square } from 'lucide-react'
import { endShift, shiftServiceKeys, startShift } from '../services/shift-service'
import { useMyShifts } from '../hooks/useMyShifts'
import { useAuth } from '@/shared/services/auth-context'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import { formatShiftDateTime } from '../utils/formatShiftDateTime'
import { formatShiftDuration } from '../utils/formatShiftDuration'
import { getPages, PageButton } from '@/shared/ui/pagination'
import { useToast } from '@/shared/ui/toast'

export default function SupportShiftsPage() {
  const [page, setPage] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const shiftsQuery = useMyShifts(page)

  const startMutation = useMutation({
    mutationFn: () => startShift({ channel: user?.support_type ?? 'web' }),
    onSuccess: async (data) => {
      setSuccessMessage(data.message ?? 'شیفت با موفقیت شروع شد.')
      setServerError(null)
      toast.success(data.message ?? 'شیفت با موفقیت شروع شد.')
      await queryClient.invalidateQueries({ queryKey: shiftServiceKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['current-shift'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      setSuccessMessage(null)
      setServerError(error instanceof Error ? error.message : 'شروع شیفت ناموفق بود.')
    },
  })

  const endMutation = useMutation({
    mutationFn: (shiftId: number) => endShift(shiftId),
    onSuccess: async (data) => {
      setSuccessMessage(data.message ?? 'شیفت با موفقیت پایان یافت.')
      setServerError(null)
      toast.success(data.message ?? 'شیفت با موفقیت پایان یافت.')
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

  const handleStartShift = () => {
    setSuccessMessage(null)
    startMutation.mutate()
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

          <div className="mt-6 flex flex-col items-start gap-4 rounded-3xl border border-border/10 bg-white/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">کانال شیفت (تعیین‌شده توسط ادمین)</p>
              <StatusPill tone={user?.support_type === 'ai' ? 'warning' : 'info'}>
                {user?.support_type === 'ai' ? 'هوش مصنوعی' : 'وب'}
              </StatusPill>
            </div>
            <Button onClick={handleStartShift} disabled={startMutation.isPending}>
              <Play />
              {startMutation.isPending ? 'در حال شروع...' : 'شروع شیفت'}
            </Button>
          </div>
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
