import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Code2, MessagesSquare, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { HttpApiError } from '@/shared/api/http'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { useToast } from '@/shared/ui/toast'
import { useAuth } from '@/shared/services/auth-context'
import { studentProfileKeys } from '@/features/student-account/services/student-profile-service'
import { useConversationMessages, useConversations } from '../hooks/useConversations'
import { createConversation, sendMessage } from '../services/chat-service'
import type { OutgoingAttachment } from '../types/chat'
import { ChatComposer } from '../components/ChatComposer'
import { ChatSidebar } from '../components/ChatSidebar'
import { MessageList } from '../components/MessageList'

const EMPTY_HINT =
  'پیام خود را بنویسید یا تصویر، فایل و پیام صوتی بفرستید. برای خوانایی بیشتر پشتیبانی، دکمه «حالت کد» را روشن کنید.'

export default function ChatPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [codeMode, setCodeMode] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const activeId = searchParams.get('c') ? Number(searchParams.get('c')) : null
  const conversationsQuery = useConversations()
  const messagesQuery = useConversationMessages(activeId)

  const selectConversation = (id: number) => {
    setSendError(null)
    setIsSidebarOpen(false)
    setSearchParams({ c: String(id) }, { replace: true })
  }

  const createMutation = useMutation({
    mutationFn: () => createConversation(),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['student', 'conversations'] })
      selectConversation(response.data.id)
      toast.success('گفتگوی جدید ساخته شد.')
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'ساخت گفتگو ناموفق بود.')
    },
  })

  const sendMutation = useMutation({
    mutationFn: ({
      body,
      codeMode: asCode,
      language,
      attachment,
    }: {
      body: string
      codeMode: boolean
      language: string
      attachment?: OutgoingAttachment
    }) => {
      if (activeId === null) throw new Error('ابتدا یک گفتگو انتخاب کنید.')
      return sendMessage({
        conversationId: activeId,
        body,
        codeMode: asCode,
        language,
        attachment,
      })
    },
    onSuccess: (response) => {
      setSendError(null)
      if (activeId !== null) {
        void queryClient.invalidateQueries({ queryKey: ['student', 'conversations', activeId] })
      }
      void queryClient.invalidateQueries({ queryKey: ['student', 'conversations'] })
      if (response.profile) {
        queryClient.setQueryData(studentProfileKeys.profile, { data: response.profile })
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof HttpApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'ارسال پیام ناموفق بود.'
      setSendError(message)
      toast.error(message)
    },
  })

  const messages = messagesQuery.data?.data.messages ?? []

  const sidebar = (
    <ChatSidebar
      conversations={conversationsQuery.data?.data ?? []}
      activeId={activeId}
      isPending={conversationsQuery.isPending}
      isCreating={createMutation.isPending}
      onSelect={selectConversation}
      onCreate={() => createMutation.mutate()}
    />
  )

  return (
    <div className="mx-auto flex h-[calc(100dvh-2rem)] w-full max-w-[1500px] gap-4 md:h-[calc(100dvh-4rem)]">
      <Card className="hidden w-80 shrink-0 overflow-y-auto p-4 lg:block">{sidebar}</Card>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="بستن فهرست گفتگوها"
            onClick={() => setIsSidebarOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <Card className="absolute inset-y-3 right-3 left-3 overflow-y-auto p-4 shadow-2xl">
            {sidebar}
          </Card>
        </div>
      ) : null}

      <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/[.08] bg-black/20 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-label="فهرست گفتگوها"
            aria-expanded={isSidebarOpen}
          >
            {isSidebarOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-active-blue/12 text-active-blue ring-1 ring-active-blue/20">
            <MessagesSquare className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-white">
              {activeId === null
                ? 'گفتگو با پشتیبانی'
                : (messagesQuery.data?.data.conversation.title ?? 'گفتگو با پشتیبانی')}
            </h1>
            <p className="truncate text-xs text-zinc-500">
              {activeId === null
                ? 'برای شروع یک گفتگوی جدید انتخاب کنید.'
                : (messagesQuery.data?.data.conversation.support?.name
                  ? `پشتیبان: ${messagesQuery.data.data.conversation.support.name}`
                  : 'در انتظار تخصیص پشتیبان')}
            </p>
          </div>

          <Button
            type="button"
            variant={codeMode ? 'primary' : 'ghost'}
            onClick={() => setCodeMode((current) => !current)}
            aria-pressed={codeMode}
            title="پیام را داخل بلوک کد ارسال کن"
          >
            <Code2 />
            {codeMode ? 'حالت کد: فعال' : 'حالت کد'}
          </Button>
        </header>

        {activeId === null ? (
          <div className="grid flex-1 place-content-center gap-4 p-10 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-active-blue/10 text-active-blue ring-1 ring-active-blue/20">
              <MessagesSquare className="size-7" />
            </span>
            <p className="max-w-md text-sm leading-8 text-zinc-500">{EMPTY_HINT}</p>
            <div className="flex justify-center">
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                <MessagesSquare />
                شروع گفتگوی جدید
              </Button>
            </div>
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              currentUserId={user?.id ?? null}
              isPending={messagesQuery.isPending}
              isError={messagesQuery.isError}
              emptyHint={EMPTY_HINT}
            />
            <ChatComposer
              onSend={(body, options) => sendMutation.mutate({ body, ...options })}
              codeMode={codeMode}
              isSending={sendMutation.isPending}
              error={sendError}
            />
          </>
        )}

        {codeMode && activeId !== null ? (
          <p className="border-t border-alret-gold/20 bg-alret-gold/8 px-4 py-2 text-[11px] text-alret-gold">
            پیام بعدی داخل بلوک کد ارسال می‌شود تا پشتیبانی بتواند کد را راحت بخواند.
          </p>
        ) : null}
      </Card>
    </div>
  )
}
