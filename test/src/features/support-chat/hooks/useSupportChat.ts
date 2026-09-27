import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/shared/ui/toast'
import {
  getSupportConversation,
  getSupportInbox,
  getSupportNotifications,
  supportChatKeys,
} from '../services/support-chat-service'
import type { SupportNotifications } from '../types/support-chat'

const POLL_INTERVAL = 5000

export function useSupportInbox() {
  return useQuery({
    queryKey: supportChatKeys.inbox,
    queryFn: getSupportInbox,
    refetchInterval: POLL_INTERVAL,
  })
}

export function useSupportConversation(conversationId: number | null) {
  return useQuery({
    queryKey: supportChatKeys.conversation(conversationId ?? 0),
    queryFn: () => getSupportConversation(conversationId as number),
    enabled: conversationId !== null,
    refetchInterval: POLL_INTERVAL,
  })
}

/**
 * نظرسنجی دوره‌ای صندوق ورودی به‌همراه اعلان پیام جدید برای گفتگوهایی که
 * پشتیبان در حال حاضر روی آن‌ها باز نکرده است.
 */
export function useNewMessageAlert(activeConversationId: number | null) {
  const toast = useToast()
  const seenRef = useRef<Set<string> | null>(null)

  const query = useQuery({
    queryKey: supportChatKeys.notifications,
    queryFn: getSupportNotifications,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  })

  const latest = query.data?.latest ?? null

  useEffect(() => {
    if (latest === null) return

    const stamp = `${latest.conversation_id}:${latest.last_message_at ?? ''}`

    if (seenRef.current === null) {
      seenRef.current = new Set([stamp])
      return
    }

    if (seenRef.current.has(stamp)) return

    seenRef.current.add(stamp)
    if (latest.conversation_id === activeConversationId) return

    toast.warning(
      `پیام جدید از ${latest.student_name ?? 'دانشجو'}: ${latest.preview ?? 'بدون متن'}`,
    )
  }, [latest, activeConversationId, toast])

  return query
}

export function supportUnreadBadge(notifications: SupportNotifications | undefined): number {
  return notifications?.unread_total ?? 0
}
