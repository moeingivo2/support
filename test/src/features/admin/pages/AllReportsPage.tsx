import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { BarChart3, RefreshCw, Search } from 'lucide-react'
import { getJson } from '@/shared/api/http'
import { adminKeys, getSupports } from '../services/admin-service'
import type { ShiftReport, LaravelPagination } from '@/features/my-shift-reports/types/shiftReport'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import { getPages, PageButton } from '@/shared/ui/pagination'
import { cn } from '@/shared/lib/utils'

type ReportsFilters = {
  page: number
  user_id?: string
  channel?: string
  date?: string
}

export default function AllReportsPage() {
  const [filters, setFilters] = useState<ReportsFilters>({ page: 1 })
  const supportsQuery = useQuery({ queryKey: adminKeys.supports, queryFn: getSupports })

  const reportsQuery = useQuery({
    queryKey: ['all-reports', filters],
    queryFn: () =>
      getJson<LaravelPagination<ShiftReport>>('/api/shift-reports', {
        page: filters.page,
        user_id: filters.user_id || undefined,
        channel: filters.channel || undefined,
        date: filters.date || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  const reports = reportsQuery.data?.data ?? []
  const pagination = reportsQuery.data

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">گزارش شیفت پشتیبان‌ها</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          گزارش‌های ثبت‌شده همه پشتیبان‌ها را با فیلتر روز، پشتیبان و نوع پشتیبانی بررسی کنید.
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
            <Search className="size-5" />
          </span>
          <h2 className="text-lg font-bold text-white">فیلترها</h2>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="filter-user">پشتیبان</Label>
            <select
              id="filter-user"
              className="h-11 w-full rounded-2xl border border-border/15 bg-white/5 px-4 text-sm text-zinc-100 outline-none transition focus-visible:border-active-blue/50 focus-visible:ring-2 focus-visible:ring-active-blue/30"
              value={filters.user_id ?? ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, page: 1, user_id: event.target.value }))
              }
            >
              <option value="">همه پشتیبان‌ها</option>
              {(supportsQuery.data?.data ?? []).map((support) => (
                <option key={support.id} value={String(support.id)}>
                  {support.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-channel">نوع پشتیبانی</Label>
            <select
              id="filter-channel"
              className="h-11 w-full rounded-2xl border border-border/15 bg-white/5 px-4 text-sm text-zinc-100 outline-none transition focus-visible:border-active-blue/50 focus-visible:ring-2 focus-visible:ring-active-blue/30"
              value={filters.channel ?? ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, page: 1, channel: event.target.value }))
              }
            >
              <option value="">همه</option>
              <option value="web">وب</option>
              <option value="ai">هوش مصنوعی</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-date">روز</Label>
            <Input
              id="filter-date"
              type="date"
              dir="ltr"
              value={filters.date ?? ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, page: 1, date: event.target.value }))
              }
            />
          </div>
        </div>

        {hasActiveFilters(filters) ? (
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => setFilters({ page: 1 })}
          >
            <RefreshCw />
            حذف فیلترها
          </Button>
        ) : null}
      </Card>

      {reportsQuery.isError ? (
        <Alert tone="danger" className="flex items-center justify-between gap-3">
          <span>دریافت گزارش‌ها ناموفق بود.</span>
          <Button variant="danger" onClick={() => reportsQuery.refetch()}>
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Alert>
      ) : reportsQuery.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="space-y-3 p-5">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-80" />
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <BarChart3 className="size-10 text-zinc-600" />
          <p className="text-base font-bold text-white">گزارشی با این فیلترها یافت نشد.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-100">
                    {report.user?.name ?? `پشتیبان #${report.user_id}`}
                    <span className="mr-2 text-xs font-normal text-zinc-500">
                      {report.shift.channel === 'ai' ? 'هوش مصنوعی' : 'وب'}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    شیفت: {report.shift.start_time ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(report.shift.start_time)) : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <MetricPill label="پاسخ‌داده" value={report.responded_students_count} tone="text-active-blue" />
                  <MetricPill label="ناراضی" value={report.unsatisfied_students_count} tone="text-err-text" />
                  <MetricPill label="Desk" value={report.desk_requests_count} tone="text-alret-gold" />
                  <MetricPill label="تماس" value={report.calls_count} tone="text-succ-txt" />
                </div>
              </div>
              {report.extra_notes ? (
                <p className="mt-3 rounded-2xl bg-white/5 p-3 text-xs leading-6 text-zinc-300">
                  {report.extra_notes}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.last_page > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <PageButton
            disabled={!pagination.prev_page_url}
            onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
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
              <PageButton
                key={p}
                active={p === pagination.current_page}
                onClick={() => setFilters((current) => ({ ...current, page: p }))}
              >
                {p.toLocaleString('fa-IR')}
              </PageButton>
            ),
          )}
          <PageButton
            disabled={!pagination.next_page_url}
            onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            aria-label="صفحه بعد"
          >
            ‹
          </PageButton>
        </div>
      ) : null}
    </div>
  )
}

function MetricPill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
      <span className={cn('font-bold', tone)}>{value.toLocaleString('fa-IR')}</span>
      <span className="text-zinc-500">{label}</span>
    </span>
  )
}

function hasActiveFilters(filters: ReportsFilters): boolean {
  return Boolean(filters.user_id || filters.channel || filters.date)
}
