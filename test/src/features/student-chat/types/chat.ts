export type MessageType = 'text' | 'code' | 'image' | 'file' | 'voice'

export type ChatSender = {
  id: number | null
  name: string | null
}

export type ChatMessage = {
  id: number
  type: MessageType
  body: string | null
  language: string | null
  attachment_name: string | null
  attachment_mime: string | null
  attachment_size: number | null
  duration_seconds: number | null
  url: string | null
  sender: ChatSender
  created_at: string | null
}

export type ConversationSummary = {
  id: number
  title: string
  last_message_preview: string | null
  last_message_at: string | null
  unread_count: number
  support: { id: number; name: string } | null
}

export type ConversationDetail = {
  conversation: ConversationSummary
  messages: ChatMessage[]
}

export type SendMessageResponse = {
  message: string
  data: ChatMessage
  profile?: import('@/features/student-account/types/student-profile').StudentProfilePayload
}

export type OutgoingAttachment = {
  file: File
  durationSeconds?: number
}
