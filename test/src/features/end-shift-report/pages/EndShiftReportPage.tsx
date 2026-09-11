import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Power, RefreshCw, TriangleAlert } from 'lucide-react'
import { EndShiftReportForm } from '../components/EndShiftReportForm'
import { ShiftSummaryCard } from '../components/ShiftSummaryCard'
import { useCreateShiftReport } from '../hooks/useCreateShiftReport'
import { useCurrentShift } from '../hooks/useCurrentShift'
import { endShift, shiftServiceKeys } from '@/features/support-shifts/services/shift-service'
import { HttpApiError } from '@/shared/api/http'
import type { ShiftReportFormValues } from '../schemas/shiftReportSchema'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export default function EndShiftReportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [endingShift, setEndingShift] = useState(false)
  const currentShiftQuery = useCurrentShift()
  const createReportMutation = useCreateShiftReport({
    onSuccess: () => setIsSubmitted(true),
  })
  const reportableShift = currentShiftQuery.data ?? null
  const shiftUnavailable =
    currentShiftQuery.isError || (!currentShiftQuery.isPending && !reportableShift)

  // اگر شیفت فعال دارد، اول باید شیفت پایان یابد تا بک‌اند گزارش را بپذیرد (422 در غیر این صورت)
  const activeRunningShift =
    reportableShift && reportableShift.status === 'active' ? reportableShift : null

  async function endRunningShift() {
    if (!activeRunningShift) return
    setEndingShift(true)
    setServerMessage(null)
    try {
      await endShift(activeRunningShift.id)
      await queryClient.invalidateQueries({ queryKey: shiftServiceKeys.all })
      await currentShiftQuery.refetch()
    } catch (error) {
      setServerMessage(error instanceof Error ? error.message : 'پایان شیفت ناموفق بود.')
    } finally {
      setEndingShift(false)
    }
  }

  useEffect(() => {
    if (!isSubmitted) {
      return
    }

    const navigationTimer = window.setTimeout(() => {
      navigate('/reports', { replace: true })
    }, 1600)

    return () => window.clearTimeout(navigationTimer)
  }, [isSubmitted, navigate])

  const handleSubmit = async (values: ShiftReportFormValues) => {
    if (!reportableShift || createReportMutation.isPending) {
      return
    }

    const payload = {
      shift_id: reportableShift.id,
      responded_students_count: values.responded_students_count,
      unsatisfied_students_count: values.unsatisfied_students_count,
      desk_requests_count: values.desk_requests_count,
      calls_count: values.calls_count,
      extra_notes: values.extra_notes?.trim() ? values.extra_notes.trim() : null,
    }

    try {
      await createReportMutation.mutateAsync(payload)
    } catch (error) {
      if (error instanceof HttpApiError && error.status === 422) {
        // خطاهای فیلد در فرم نمایش داده می‌شوند
      } else {
        setServerMessage(error instanceof Error ? error.message : null)
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">گزارش پایان شیفت</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          لطفاً گزارش فعالیت‌های انجام‌شده در این شیفت را ثبت کنید.
        </p>
      </Card>

      {currentShiftQuery.isPending ? (
        <ShiftSummarySkeleton />
      ) : activeRunningShift ? (
        <Card className="flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-bold text-white">شیفت شما هنوز در جریان است</p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              برای ثبت گزارش، ابتدا شیفت جاری را پایان دهید. سپس فرم گزارش فعال می‌شود.
            </p>
          </div>
          <Button variant="danger" onClick={endRunningShift} disabled={endingShift}>
            <Power />
            {endingShift ? 'در حال پایان...' : 'پایان دادن به شیفت جاری'}
          </Button>
        </Card>
      ) : reportableShift ? (
        <ShiftSummaryCard shift={reportableShift} />
      ) : (
        <Alert tone="warning">
          <span>شیفت قابل گزارشی پیدا نشد.</span>
        </Alert>
      )}

      {serverMessage ? (
        <Alert
          tone="danger"
          className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{serverMessage}</span>
          <Button
            variant="danger"
            onClick={() => {
              createReportMutation.reset()
              setServerMessage(null)
            }}
          >
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Alert>
      ) : null}

      {isSubmitted ? (
        <Card className="flex flex-col items-center gap-4 border-succ-txt/20 bg-succ-btn/10 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-succ-btn text-succ-txt">
            <CheckCircle2 />
          </span>
          <p className="text-lg font-bold text-white">گزارش پایان شیفت با موفقیت ثبت شد.</p>
          <p className="text-sm text-zinc-400">در حال انتقال به گزارش‌های من...</p>
        </Card>
      ) : shiftUnavailable ? (
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-alret-gold/10 text-alret-gold">
            <TriangleAlert />
          </span>
          <p className="text-base font-bold text-white">گزارش در انتظاری وجود ندارد.</p>
          <p className="text-sm leading-6 text-zinc-400">
            همه شیفت‌های پایان‌یافته شما گزارش دارند. پس از پایان شیفت بعدی، فرم اینجا فعال می‌شود.
          </p>
          <Button variant="ghost" onClick={() => currentShiftQuery.refetch()}>
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Card>
      ) : activeRunningShift ? null : (
        <EndShiftReportForm
          disabled={isSubmitted}
          submitError={createReportMutation.error}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      )}
    </div>
  )
}

function ShiftSummarySkeleton() {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
    </Card>
  )
}
