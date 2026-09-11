import {
  AlertCircle,
  ClipboardList,
  FileWarning,
  Info,
  RotateCcw,
  Smile,
  Users,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import type { DashboardMetrics } from '../services/dashboard-service'

const metricCards = [
  {
    label: 'نارضایتی‌های ثبت‌شده در این هفته',
    field: 'weeklySatisfaction',
    icon: Smile,
  },
  {
    label: 'دانشجویان پاسخ‌داده‌شده در این هفته',
    field: 'answeredStudents',
    icon: Users,
  },
  {
    label: 'مشکلات باز منتورها',
    field: 'mentorIssues',
    icon: FileWarning,
  },
  {
    label: 'تعداد سرویس‌های موجود',
    field: 'availableServices',
    icon: ClipboardList,
  },
] as const satisfies Array<{
  label: string
  field: keyof DashboardMetrics
  icon: typeof Smile
}>

export function DashboardMetricsSection({
  error,
  metrics,
  onRetry,
  status,
}: {
  error?: Error | null
  metrics?: DashboardMetrics
  onRetry: () => void
  status: 'loading' | 'error' | 'empty' | 'success'
}) {
  return (
    <section className="space-y-4" aria-labelledby="dashboard-activity">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="dashboard-activity" className="text-xl font-bold text-white">
          فعالیت این هفته
        </h2>
        <StatusPill tone="warning">
          <Info className="size-3.5" />
          داده‌ها هر ۶۰ ثانیه یک‌بار تازه‌سازی می‌شوند
        </StatusPill>
      </div>

      {status === 'loading' && <MetricsLoading />}
      {status === 'error' && <MetricsError error={error} onRetry={onRetry} />}
      {status === 'empty' && <MetricsEmpty />}
      {status === 'success' && metrics && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {metricCards.map((metric) => (
            <Card key={metric.field} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl font-black text-white">
                  {metrics[metric.field].toLocaleString('fa-IR')}
                </span>
              </div>
              <p className="mt-4 text-sm leading-5 text-zinc-400">{metric.label}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function MetricsLoading() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="space-y-4 p-5">
          <div className="flex items-start justify-between">
            <Skeleton className="size-10 rounded-2xl" />
            <Skeleton className="h-9 w-12" />
          </div>
          <Skeleton className="h-4 w-4/5" />
        </Card>
      ))}
    </div>
  )
}

function MetricsError({
  error,
  onRetry,
}: {
  error?: Error | null
  onRetry: () => void
}) {
  return (
    <Card className="flex flex-col items-center gap-4 border-err-text/20 bg-err-text/5 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-err-text/10 text-err-text">
        <AlertCircle />
      </span>
      <div>
        <p className="font-bold text-white">نمایش آمار داشبورد ممکن نیست</p>
        <p className="mt-1 text-sm text-zinc-400">
          {error?.message ?? 'اتصال به سرویس آماری برقرار نشد.'}
        </p>
      </div>
      <Button variant="ghost" onClick={onRetry}>
        <RotateCcw />
        تلاش مجدد
      </Button>
    </Card>
  )
}

function MetricsEmpty() {
  return (
    <Card className="flex flex-col items-center gap-3 border-alret-gold/20 bg-alret-gold/5 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-alret-gold/10 text-alret-gold">
        <ClipboardList />
      </span>
      <p className="font-bold text-white">آماری برای نمایش وجود ندارد</p>
      <p className="text-sm text-zinc-400">با ثبت اولین فعالیت، کارت‌ها به‌روزرسانی می‌شوند.</p>
    </Card>
  )
}
