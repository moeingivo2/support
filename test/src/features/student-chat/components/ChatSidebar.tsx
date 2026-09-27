import { useNavigate } from 'react-router-dom'
import { MessageSquarePlus, MessagesSquare, UserRound } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { useAuth } from '@/shared/services/auth-context'
import type { ConversationSummary } from '../types/chat'
import { formatConversationDate } from '../utils/format'
import { toPersianDigits } from '../utils/persian'

type ChatSidebarProps = {
  conversations: ConversationSummary[]
  activeId: number | null
  isPending: boolean
  onSelect: (id: number) => void
  onCreate: () => void
  isCreating: boolean
}

export function ChatSidebar({
  conversations,
  activeId,
  isPending,
  onSelect,
  onCreate,
  isCreating,
}: ChatSidebarProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="flex h-full flex-col gap-4">
      <Button onClick={onCreate} disabled={isCreating} className="w-full">
        <MessageSquarePlus />
        {isCreating ? 'در حال ساخت...' : 'گفتگوی جدید'}
      </Button>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-zinc-500">گفتگوهای قبلی</span>
        <span className="text-[11px] text-zinc-600">
          {toPersianDigits(conversations.length)} گفتگو
        </span>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto" aria-label="فهرست گفتگوها">
        {isPending
          ? Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16" />)
          : null}

        {!isPending && conversations.length === 0 ? (
          <div className="grid place-content-center gap-2 rounded-3xl border border-dashed border-white/10 p-6 text-center">
            <MessagesSquare className="mx-auto size-6 text-zinc-600" />
            <p className="text-xs leading-6 text-zinc-500">
              هنوز گفتگویی ندارید. با دکمه «گفتگوی جدید» شروع کنید.
            </p>
          </div>
        ) : null}

        {conversations.map((conversation) => {
          const active = conversation.id === activeId
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex w-full flex-col gap-1 rounded-2xl border p-3 text-right transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active-blue/70',
                active
                  ? 'border-active-blue/30 bg-active-blue/10'
                  : 'border-transparent hover:border-white/[.08] hover:bg-white/[.045]',
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'line-clamp-1 flex-1 text-sm font-semibold',
                    active ? 'text-active-blue' : 'text-zinc-200',
                  )}
                >
                  {conversation.title}
                </span>
                {conversation.unread_count > 0 ? (
                  <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-err-text px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {toPersianDigits(conversation.unread_count)}
                  </span>
                ) : null}
              </span>
              <span className="line-clamp-1 text-xs text-zinc-500">
                {conversation.last_message_preview ?? 'بدون پیام'}
              </span>
              <span className="flex items-center justify-between text-[11px] text-zinc-600">
                <span>{formatConversationDate(conversation.last_message_at)}</span>
                {conversation.support ? (
                  <span className="truncate text-zinc-500">{conversation.support.name}</span>
                ) : (
                  <span className="text-alret-gold">در انتظار پشتیبان</span>
                )}
              </span>
            </button>
          )
        })}
      </nav>

      <Button
        type="button"
        variant="ghost"
        onClick={() => navigate('/account')}
        className="w-full justify-start gap-3 border-white/10 px-4"
        aria-label="رفتن به صفحه حساب کاربری"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-active-blue/15 text-sm font-bold text-active-blue">
          {user?.name?.trim().charAt(0) || '؟'}
        </span>
        <span className="min-w-0 flex-1 text-right">
          <span className="block truncate text-sm font-semibold text-zinc-100">
            {user?.name ?? 'کاربر'}
          </span>
          <span className="block text-[11px] text-zinc-500">مشاهده حساب کاربری</span>
        </span>
        <UserRound className="size-4 text-zinc-500" />
      </Button>
    </div>
  )
}
