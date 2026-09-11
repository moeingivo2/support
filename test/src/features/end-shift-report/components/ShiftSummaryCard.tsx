import { CalendarDays, Clock, Radio } from 'lucide-react'
import { Card } from '@/shared/ui/card'
import { StatusPill } from '@/shared/ui/status-pill'
import { formatShiftChannel, formatShiftDate, formatShiftTime } from '../utils/formatShiftPresentation'
import { formatShiftStatus } from '../utils/formatShiftStatus'
import type { Shift } from '../types/shiftReport'

type ShiftSummaryCardProps = {
  shift: Shift
}

export function ShiftSummaryCard({ shift }: ShiftSummaryCardProps) {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryField label="وضعیت">
          <StatusPill
            tone={shift.status === 'active' ? 'success' : shift.status === 'cancelled' ? 'danger' : 'neutral'}
          >
            {formatShiftStatus(shift.status)}
          </StatusPill>
        </SummaryField>
        <SummaryField icon={<Clock className="size-4" />} label="شروع شیفت">
          <span className="text-sm font-semibold text-zinc-100">
            {formatShiftTime(shift.start_time)}
          </span>
        </SummaryField>
        <SummaryField icon={<Radio className="size-4" />} label="کانال">
          <span className="text-sm font-semibold text-zinc-100">
            {formatShiftChannel(shift.channel)}
          </span>
        </SummaryField>
        <SummaryField icon={<CalendarDays className="size-4" />} label="تاریخ">
          <span className="text-sm font-semibold text-zinc-100">
            {formatShiftDate(shift.start_time)}
          </span>
        </SummaryField>
      </div>
    </Card>
  )
}

function SummaryField({
  children,
  icon,
  label,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  label: string
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
        {icon}
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  )
}
