import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, MessageSquareWarning, Plus, RefreshCw } from 'lucide-react'
import { useComplaints } from '../hooks/useComplaints'
import { ComplaintForm } from '../components/ComplaintForm'
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  complaintKeys,
  updateComplaintStatus,
  type ComplaintStatus,
} from '../services/complaint-service'
import type { Complaint } from '../types/complaint'
import { useActiveShift } from '@/features/support-shifts/hooks/useActiveShift'
import { useAuth } from '@/shared/services/auth-context'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { StatusPill } from '@/shared/ui/status-pill'
import { getPages, PageButton } from '@/shared/ui/pagination'
import { formatShiftDateTime } from '../utils/formatComplaintDate'
import { cn } from '@/shared/lib/utils'

export default function StudentComplaintsPage() {
  const { user } = useAuth()
  const isSupport = user?.role === 'support'
  const [tab, setTab] = useState<'all' | 'mine'>('all')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const complaintsQuery = useComplaints(page, isSupport && tab === 'mine' ? 'mine' : 'all')
  // شیفت فعال فقط برای ساپورت واکشی می‌شود (ادمین به endpoint شیفت دسترسی ندارد)
  const currentShift = useActiveShift(isSupport)
  const activeShift = isSupport ? currentShift.data : null

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ComplaintStatus }) =>
      updateComplaintStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: complaintKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const complaints = complaintsQuery.data?.data ?? []
  const pagination = complaintsQuery.data

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
              نارضایتی دانشجویان
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              {isSupport
                ? 'ثبت و پیگیری نارضایتی یا مشکل دانشجو نسبت به منتور.'
                : 'همه نارضایتی‌های ثبت‌شده تیم به‌همراه منتور مرتبط و پشتیبان ثبت‌کننده.'}
            </p>
          </div>
          {isSupport ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus />
              ثبت نارضایتی جدید
            </Button>
          ) : null}
        </div>
      </Card>

      {successMessage ? <Alert tone="success">{successMessage}</Alert> : null}
      {statusMutation.isError ? (
        <Alert tone="danger">تغییر وضعیت ناموفق بود. دوباره تلاش کنید.</Alert>
      ) : null}
      {complaintsQuery.isError ? (
        <Alert tone="danger" className="flex items-center justify-between gap-3">
          <span>دریافت نارضایتی‌ها ناموفق بود.</span>
          <Button variant="danger" onClick={() => complaintsQuery.refetch()}>
            <RefreshCw />
            تلاش مجدد
          </Button>
        </Alert>
      ) : null}

      {isSupport ? (
        <div className="flex gap-2" role="tablist" aria-label="نوع نارضایتی‌ها">
          <TabButton active={tab === 'all'} onClick={() => { setTab('all'); setPage(1) }}>
            همه موارد من
          </TabButton>
          <TabButton active={tab === 'mine'} onClick={() => { setTab('mine'); setPage(1) }}>
            ثبت‌شده توسط من
          </TabButton>
        </div>
      ) : null}

      {complaintsQuery.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="space-y-3 p-5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <MessageSquareWarning className="size-10 text-zinc-600" />
          <p className="text-base font-bold text-white">موردی ثبت نشده است.</p>
          <p className="text-sm text-zinc-400">
            با دکمه «ثبت نارضایتی جدید» اولین مورد را ثبت کنید.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {complaints.map((complaint) => (
            <ComplaintRow
              key={complaint.id}
              complaint={complaint}
              expanded={expandedId === complaint.id}
              onToggle={() =>
                setExpandedId((current) => (current === complaint.id ? null : complaint.id))
              }
              onStatusChange={(status) =>
                statusMutation.mutate({ id: complaint.id, status })
              }
              statusChanging={statusMutation.isPending}
            />
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

      <ComplaintForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(message) => {
          setSuccessMessage(message)
          void queryClient.invalidateQueries({ queryKey: complaintKeys.all })
          void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
        activeShiftId={activeShift?.id ?? null}
      />
    </div>
  )
}

function ComplaintRow({
  complaint,
  expanded,
  onToggle,
  onStatusChange,
  statusChanging,
}: {
  complaint: Complaint
  expanded: boolean
  onToggle: () => void
  onStatusChange: (status: ComplaintStatus) => void
  statusChanging: boolean
}) {
  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-right"
        aria-expanded={expanded}
      >
        <div className="space-y-1">
          <p className="text-sm font-bold text-zinc-100">
            {complaint.student.name}
            <span className="mr-2 text-xs font-normal text-zinc-500">
              منتور: {complaint.mentor.name}
            </span>
          </p>
          <p className="text-xs text-zinc-500">{formatShiftDateTime(complaint.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={complaint.priority === 'high' ? 'danger' : complaint.priority === 'normal' ? 'warning' : 'neutral'}>
            اولویت: {PRIORITY_LABELS[complaint.priority] ?? complaint.priority}
          </StatusPill>
          <StatusPill tone={complaint.status === 'resolved' ? 'success' : complaint.status === 'in_progress' ? 'warning' : 'neutral'}>
            {STATUS_LABELS[complaint.status] ?? complaint.status}
          </StatusPill>
          <ChevronDown
            className={cn('size-4 text-zinc-500 transition', expanded && 'rotate-180')}
          />
        </div>
      </button>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-border/10 pt-4">
          <p className="text-sm leading-7 text-zinc-300">{complaint.description}</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-zinc-500">تغییر وضعیت:</label>
            <select
              className="h-9 rounded-xl border border-border/15 bg-white/5 px-3 text-xs text-zinc-100 outline-none"
              value={complaint.status}
              disabled={statusChanging}
              onChange={(event) => onStatusChange(event.target.value as ComplaintStatus)}
            >
              <option value="open">باز</option>
              <option value="in_progress">در حال بررسی</option>
              <option value="resolved">حل‌شده</option>
            </select>
            {complaint.support ? (
              <span className="text-xs text-zinc-600">
                ثبت‌کننده: {complaint.support.name}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-5 py-2 text-xs font-semibold transition',
        active
          ? 'bg-active-blue text-white'
          : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}
