import { Inbox } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { toPersianDigits } from '@/features/student-chat/utils/persian'
import { formatConversationDate } from '@/features/student-chat/utils/format'
import type { SupportConversationSummary } from '../types/support-chat'

type ConversationListProps = {
  conversations: SupportConversationSummary[]
  activeId: number | null
  isPending: boolean
  onSelect: (id: number) => void
}

export function ConversationList({
  conversations,
  activeId,
  isPending,
  onSelect,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="text-xs font-bold text-zinc-500">گفتگوی دانشجویان</span>
        <span className="text-[11px] text-zinc-600">
          {toPersianDigits(conversations.length)} مورد
        </span>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto" aria-label="فهرست گفتگوهای دانشجویان">
        {isPending
          ? Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-16" />)
          : null}

        {!isPending && conversations.length === 0 ? (
          <div className="grid place-content-center gap-2 rounded-3xl border border-dashed border-white/10 p-6 text-center">
            <Inbox className="mx-auto size-6 text-zinc-600" />
            <p className="text-xs leading-6 text-zinc-500">
              هنوز گفتگویی از دانشجویان ثبت نشده است.
            </p>
          </div>
        ) : null}

        {conversations.map((conversation) => {
          const active = conversation.id === activeId
          const hasUnread = conversation.unread_count > 0
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex w-full items-start gap-3 rounded-2xl border p-3 text-right transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/70',
                active
                  ? 'border-active-blue/30 bg-active-blue/10'
                  : 'border-transparent hover:border-white/[.08] hover:bg-white/[.045]',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold',
                  hasUnread
                    ? 'bg-err-text/20 text-err-text ring-1 ring-err-text/40'
                    : 'bg-white/5 text-zinc-400',
                )}
              >
                {getInitial(conversation.student?.name)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'line-clamp-1 flex-1 text-sm',
                      hasUnread ? 'font-bold text-white' : 'font-semibold text-zinc-300',
                    )}
                  >
                    {conversation.student?.name ?? 'دانشجوی حذف‌شده'}
                  </span>
                  {hasUnread ? (
                    <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-err-text px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {toPersianDigits(conversation.unread_count)}
                    </span>
                  ) : null}
                </span>
                <span className="line-clamp-1 text-xs text-zinc-500">
                  {conversation.last_message_preview ?? 'بدون پیام'}
                </span>
                <span className="mt-0.5 flex items-center justify-between text-[11px] text-zinc-600">
                  <span>{formatConversationDate(conversation.last_message_at)}</span>
                  {conversation.support ? (
                    <span className="truncate text-zinc-500">{conversation.support.name}</span>
                  ) : (
                    <span className="text-alret-gold">تخصیص‌نیافته</span>
                  )}
                </span>
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function getInitial(name: string | undefined): string {
  return name?.trim().charAt(0) || '؟'
}
