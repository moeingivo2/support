import { ClipboardList } from 'lucide-react'
import { Card } from '@/shared/ui/card'
import { ShiftReportCard } from './ShiftReportCard'
import type { ShiftReport } from '../types/shiftReport'

type ShiftReportListProps = {
  reports: ShiftReport[]
  onOpenDetails: (report: ShiftReport) => void
}

export function ShiftReportList({ reports, onOpenDetails }: ShiftReportListProps) {
  if (reports.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center">
        <ClipboardList className="size-10 text-zinc-600" />
        <p className="text-base font-bold text-white">هنوز گزارشی برای شما ثبت نشده است.</p>
        <p className="text-sm text-zinc-400">
          پس از پایان شیفت، گزارش خود را در بخش «گزارش پایان شیفت» ثبت کنید.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {reports.map((report) => (
        <ShiftReportCard key={report.id} report={report} onOpenDetails={onOpenDetails} />
      ))}
    </div>
  )
}
