import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { ShiftReportDetailsDialog } from '../components/ShiftReportDetailsDialog'
import { ShiftReportList } from '../components/ShiftReportList'
import { ShiftReportPagination } from '../components/ShiftReportPagination'
import { ShiftReportSummary } from '../components/ShiftReportSummary'
import { useMyShiftReports } from '../hooks/useMyShiftReports'
import type { ShiftReport } from '../types/shiftReport'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export default function MyShiftReportsPage() {
  const [page, setPage] = useState(1)
  const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(null)
  const reportsQuery = useMyShiftReports(page)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">گزارش‌های من</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          گزارش فعالیت‌های ثبت‌شده در شیفت‌های شما
        </p>
      </Card>

      {reportsQuery.isError ? (
        <Alert tone="danger" className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>دریافت گزارش‌های شما با خطا مواجه شد.</span>
          <Button variant="danger" onClick={() => reportsQuery.refetch()}>
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Alert>
      ) : null}

      <ShiftReportSummary
        summary={reportsQuery.data?.summary}
        status={reportsQuery.isPending ? 'loading' : 'success'}
      />

      {reportsQuery.isPending ? (
        <ReportsSkeleton />
      ) : (
        <ShiftReportList
          reports={reportsQuery.data?.items ?? []}
          onOpenDetails={setSelectedReport}
        />
      )}

      {reportsQuery.data && reportsQuery.data.pagination.last_page > 1 ? (
        <ShiftReportPagination
          pagination={reportsQuery.data.pagination}
          onPageChange={setPage}
        />
      ) : null}

      <ShiftReportDetailsDialog
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }, (_, metricIndex) => (
              <div key={metricIndex} className="space-y-2">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
          <Skeleton className="h-20 w-full rounded-3xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-11 w-full" />
        </Card>
      ))}
    </div>
  )
}
