import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CalendarDays, Clock, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { StatusPill } from '@/shared/ui/status-pill'
import { formatShiftDateTime } from '../utils/formatShiftDateTime'
import { formatShiftDuration } from '../utils/formatShiftDuration'
import { formatShiftStatus } from '../utils/formatShiftStatus'
import type { ShiftReport } from '../types/shiftReport'

type ShiftReportDetailsDialogProps = {
  report: ShiftReport | null
  onClose: () => void
}

export function ShiftReportDetailsDialog({ report, onClose }: ShiftReportDetailsDialogProps) {
  if (!report) {
    return null
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 space-y-6 overflow-y-auto rounded-4xl border border-border/10 bg-deactive-btn-gray p-6 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-xl font-bold text-white">
                جزئیات گزارش
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-zinc-400">
                اطلاعات کامل این گزارش و شیفت مرتبط با آن
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="بستن جزئیات گزارش">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-border/10 bg-white/5 p-4">
            <DetailField label="شناسه گزارش" value={report.id.toLocaleString('fa-IR')} />
            <DetailField label="شناسه شیفت" value={report.shift_id.toLocaleString('fa-IR')} />
            <DetailField label="تاریخ شیفت" value={formatShiftDateTime(report.shift.start_time)} />
            <DetailField label="شروع شیفت" value={formatShiftDateTime(report.shift.start_time)} />
            <DetailField
              label="پایان شیفت"
              value={
                report.shift.end_time ? formatShiftDateTime(report.shift.end_time) : 'در حال انجام'
              }
            />
            <DetailField
              label="مدت شیفت"
              value={formatShiftDuration(report.shift.start_time, report.shift.end_time)}
            />
            <div>
              <p className="text-xs text-zinc-500">وضعیت شیفت</p>
              <StatusPill
                tone={getShiftStatusTone(report.shift.status)}
                className="mt-2"
              >
                {formatShiftStatus(report.shift.status)}
              </StatusPill>
            </div>
            <DetailField label="کانال شیفت" value={report.shift.channel} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailField
              label="دانشجویان پاسخ‌داده‌شده"
              value={report.responded_students_count.toLocaleString('fa-IR')}
            />
            <DetailField
              label="دانشجویان ناراضی"
              value={report.unsatisfied_students_count.toLocaleString('fa-IR')}
            />
            <DetailField
              label="درخواست‌های میز"
              value={report.desk_requests_count.toLocaleString('fa-IR')}
            />
            <DetailField label="تماس‌ها" value={report.calls_count.toLocaleString('fa-IR')} />
          </div>

          <div className="space-y-2 rounded-3xl border border-border/10 bg-white/5 p-4">
            <p className="text-xs text-zinc-500">یادداشت‌های اضافی</p>
            {report.extra_notes ? (
              <p className="text-sm leading-7 text-zinc-200">{report.extra_notes}</p>
            ) : (
              <p className="text-sm italic text-zinc-600">یادداشتی ثبت نشده است.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-3xl border border-border/10 bg-white/5 p-4 sm:grid-cols-2">
            <DetailField
              label="تاریخ ثبت گزارش"
              value={formatShiftDateTime(report.created_at)}
            />
            <DetailField label="آخرین بروزرسانی" value={formatShiftDateTime(report.updated_at)} />
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <CalendarDays className="size-4" />
            <span>{formatShiftDateTime(report.created_at)}</span>
            <Clock className="size-4" />
            <span>{formatShiftDuration(report.shift.start_time, report.shift.end_time)}</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  )
}

function getShiftStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'ended') {
    return 'success'
  }

  if (status === 'active') {
    return 'warning'
  }

  if (status === 'cancelled') {
    return 'danger'
  }

  return 'neutral'
}
