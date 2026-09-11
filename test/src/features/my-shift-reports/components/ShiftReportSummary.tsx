import { MessageSquareWarning, Sparkles, Users } from 'lucide-react'
import { Card } from '@/shared/ui/card'
import type { ShiftReportSummary as SummaryData } from '../services/shiftReportService'

type ShiftReportSummaryProps = {
  summary: SummaryData | undefined
  status: 'loading' | 'success'
}

export function ShiftReportSummary({ summary, status }: ShiftReportSummaryProps) {
  const summaryCards = [
    {
      field: 'respondedStudents' as const,
      label: 'پاسخگویی به دانشجویان (این صفحه)',
      icon: Users,
      tone: 'text-active-blue bg-active-blue/10 ring-active-blue/20',
    },
    {
      field: 'unsatisfiedStudents' as const,
      label: 'دانشجویان ناراضی (این صفحه)',
      icon: MessageSquareWarning,
      tone: 'text-err-text bg-err-text/10 ring-err-text/20',
    },
    {
      field: 'deskRequests' as const,
      label: 'درخواست‌های میز (این صفحه)',
      icon: Sparkles,
      tone: 'text-alret-gold bg-alret-gold/10 ring-alret-gold/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {summaryCards.map((card) => (
        <Card key={card.field} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <span className="text-3xl font-black text-white">
              {status === 'loading' ? (
                '-'
              ) : (
                (summary?.[card.field] ?? 0).toLocaleString('fa-IR')
              )}
            </span>
            <span className={`grid size-11 place-items-center rounded-2xl ring-1 ${card.tone}`}>
              <card.icon className="size-5" />
            </span>
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-400">{card.label}</p>
        </Card>
      ))}
    </div>
  )
}
