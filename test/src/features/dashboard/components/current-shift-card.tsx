import { Power, Square, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Dot } from '@/shared/ui/dot'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'

type CurrentShiftCardProps = {
  userName: string
  activeShift: boolean
  shiftStart: string
  shiftDuration: ReactNode
  onEndShift?: () => void
  isEndingShift?: boolean
}

export function CurrentShiftCard({
  activeShift,
  isEndingShift = false,
  onEndShift,
  shiftDuration,
  shiftStart,
  userName,
}: CurrentShiftCardProps) {
  return (
    <Card className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
      <div className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-3xl bg-active-blue/12 text-active-blue ring-1 ring-active-blue/20">
          <UserRound />
        </span>
        <div>
          <p className="text-xs text-zinc-500">کاربر جاری</p>
          {userName ? (
            <p className="mt-1 font-bold text-white">{userName}</p>
          ) : (
            <Skeleton className="mt-2 h-4 w-24" />
          )}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-5 md:grid-cols-3">
        <div>
          <p className="text-xs text-zinc-500">وضعیت شیفت</p>
          {activeShift ? (
            <StatusPill tone="success" className="mt-2">
              <Dot />
              در حال شیفت
            </StatusPill>
          ) : (
            <StatusPill tone="warning" className="mt-2">
              شیفت فعال نیست
            </StatusPill>
          )}
        </div>
        <div>
          <p className="text-xs text-zinc-500">ساعت شروع</p>
          <p className="mt-1.5 text-sm font-semibold text-zinc-100">{shiftStart}</p>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="text-xs text-zinc-500">مدت شیفت</p>
          {shiftDuration ? (
            <p className="mt-1.5 text-sm font-semibold text-zinc-100">{shiftDuration}</p>
          ) : (
            <Skeleton className="mt-2 h-5 w-28" />
          )}
        </div>
      </div>
      {activeShift && onEndShift ? (
        <Button variant="danger" onClick={onEndShift} disabled={isEndingShift}>
          <Square />
          {isEndingShift ? 'در حال پایان...' : 'پایان شیفت'}
        </Button>
      ) : activeShift ? (
        <Button variant="danger" asChild>
          <Link to="/end-shift-report">
            <Power />
            پایان شیفت
          </Link>
        </Button>
      ) : null}
    </Card>
  )
}
