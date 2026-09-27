import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, GraduationCap, MessagesSquare, PanelRightClose, PanelRightOpen, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { HttpApiError } from '@/shared/api/http'
import { Card } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { StatusPill } from '@/shared/ui/status-pill'
import { toPersianDigits } from '@/features/student-chat/utils/persian'
import { MessageList } from '@/features/student-chat/components/MessageList'
import type { OutgoingAttachment } from '@/features/student-chat/types/chat'
import { useAuth } from '@/shared/services/auth-context'
import {
  useNewMessageAlert,
  useSupportConversation,
  useSupportInbox,
} from '../hooks/useSupportChat'
import { sendReply, supportChatKeys } from '../services/support-chat-service'
import { ConversationList } from '../components/ConversationList'
import { SupportComposer } from '../components/SupportComposer'

const EMPTY_HINT = 'هنوز پیامی در این گفتگو ثبت نشده است. اولین پاسخ را بنویسید.'

export default function SupportInboxPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sendError, setSendError] = useState<string | null>(null)
  const [isListOpen, setIsListOpen] = useState(false)

  const activeId = searchParams.get('c') ? Number(searchParams.get('c')) : null
  const inboxQuery = useSupportInbox()
  const notificationsQuery = useNewMessageAlert(activeId)
  const conversationQuery = useSupportConversation(activeId)

  const conversations = inboxQuery.data?.data ?? []
  const profile = conversationQuery.data?.data.profile ?? null
  const unreadTotal = notificationsQuery.data?.unread_total ?? 0

  function selectConversation(id: number) {
    setSendError(null)
    setIsListOpen(false)
    setSearchParams({ c: String(id) }, { replace: true })
  }

  const replyMutation = useMutation({
    mutationFn: ({
      body,
      codeMode,
      language,
      attachment,
    }: {
      body: string
      codeMode: boolean
      language: string
      attachment?: OutgoingAttachment
    }) => {
      if (activeId === null) throw new Error('ابتدا یک گفتگو انتخاب کنید.')
      return sendReply({ conversationId: activeId, body, codeMode, language, attachment })
    },
    onSuccess: () => {
      setSendError(null)
      if (activeId !== null) {
        void queryClient.invalidateQueries({ queryKey: supportChatKeys.conversation(activeId) })
      }
      void queryClient.invalidateQueries({ queryKey: supportChatKeys.inbox })
    },
    onError: (error: unknown) => {
      const message =
        error instanceof HttpApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'ارسال پاسخ ناموفق بود.'
      setSendError(message)
    },
  })

  const list = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      isPending={inboxQuery.isPending}
      onSelect={selectConversation}
    />
  )

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] min-h-[36rem] w-full max-w-[1500px] gap-4">
      <Card className="hidden w-88 shrink-0 overflow-y-auto p-4 xl:block">{list}</Card>

      {isListOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden">
          <button
            type="button"
            aria-label="بستن فهرست گفتگوها"
            onClick={() => setIsListOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <Card className="absolute inset-y-3 right-3 left-3 overflow-y-auto p-4 shadow-2xl">
            {list}
          </Card>
        </div>
      ) : null}

      <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/[.08] bg-black/20 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={() => setIsListOpen((current) => !current)}
            aria-label="فهرست گفتگوها"
            aria-expanded={isListOpen}
          >
            {isListOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>

          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-active-blue/12 text-active-blue ring-1 ring-active-blue/20">
            <MessagesSquare className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-white">
              {activeId === null
                ? 'صندوق ورودی گفتگوها'
                : (conversationQuery.data?.data.conversation.student?.name ?? 'گفتگوی دانشجو')}
            </h1>
            <p className="truncate text-xs text-zinc-500">
              {activeId === null
                ? 'همه گفتگوهای دانشجویان برای همه پشتیبان‌ها قابل مشاهده است.'
                : (conversationQuery.data?.data.conversation.title ?? '')}
            </p>
          </div>

          {unreadTotal > 0 ? (
            <StatusPill tone="danger">
              <Bell className="size-3" />
              {toPersianDigits(unreadTotal)} خوانده‌نشده
            </StatusPill>
          ) : null}
        </header>

        {activeId === null ? (
          <div className="grid flex-1 place-content-center gap-4 p-10 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
              <MessagesSquare className="size-7" />
            </span>
            <p className="max-w-md text-sm leading-8 text-zinc-500">
              از فهرست سمت راست یک گفتگو را انتخاب کنید تا پیام‌های دانشجو را ببینید و پاسخ دهید.
            </p>
          </div>
        ) : (
          <>
            {profile ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-white/[.06] bg-black/15 px-4 py-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <GraduationCap className="size-3.5 text-alret-gold" />
                  {profile.course_label}
                  {profile.track_label ? ` / ${profile.track_label}` : ''}
                </span>
                {profile.purchased_sessions.length > 0 ? (
                  <span>جلسات: {toPersianDigits(profile.purchased_sessions.join('، '))}</span>
                ) : null}
                <span className="flex items-center gap-1">
                  <UserRound className="size-3.5" />
                  {profile.mentor_name ?? 'بدون منتور'}
                </span>
                <span
                  className={
                    profile.is_low_on_chats ? 'font-bold text-err-text' : 'text-succ-txt'
                  }
                >
                  {toPersianDigits(profile.remaining_percentage)}٪ چت باقی‌مانده
                </span>
              </div>
            ) : null}

            <MessageList
              messages={conversationQuery.data?.data.messages ?? []}
              currentUserId={user?.id ?? null}
              isPending={conversationQuery.isPending}
              isError={conversationQuery.isError}
              emptyHint={EMPTY_HINT}
            />

            <SupportComposer
              onSend={(body, options) => replyMutation.mutate({ body, ...options })}
              isSending={replyMutation.isPending}
              error={sendError}
            />
          </>
        )}
      </Card>
    </div>
  )
}
