import { useEffect, useRef } from 'react'
import { MessagesSquare } from 'lucide-react'
import { Skeleton } from '@/shared/ui/skeleton'
import type { ChatMessage } from '../types/chat'
import { MessageBubble } from './MessageBubble'

type MessageListProps = {
  messages: ChatMessage[]
  currentUserId: number | null
  isPending: boolean
  isError: boolean
  emptyHint: string
}

export function MessageList({
  messages,
  currentUserId,
  isPending,
  isError,
  emptyHint,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null)
  const lastMessageId = messages.at(-1)?.id ?? 0

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastMessageId])

  if (isPending) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ms-auto h-12 w-1/2" />
        <Skeleton className="h-20 w-3/4" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="p-8 text-center text-sm text-err-text">
        دریافت پیام‌ها ناموفق بود. اتصال خود را بررسی کنید.
      </p>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="grid flex-1 place-content-center gap-3 p-10 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
          <MessagesSquare className="size-6" />
        </span>
        <p className="max-w-sm text-sm leading-7 text-zinc-500">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.sender.id !== null && message.sender.id === currentUserId}
        />
      ))}
      <div ref={endRef} />
    </div>
  )
}
