export type SupportConversationSummary = {
  id: number
  title: string
  last_message_preview: string | null
  last_message_at: string | null
  unread_count: number
  student: { id: number; name: string; email: string | null } | null
  support: { id: number; name: string } | null
}

export type SupportConversationDetail = {
  conversation: SupportConversationSummary
  profile: import('@/features/student-account/types/student-profile').StudentProfilePayload | null
  messages: import('@/features/student-chat/types/chat').ChatMessage[]
}

export type SupportInboxResponse = {
  data: SupportConversationSummary[]
  unread_total: number
}

export type SupportNotifications = {
  unread_total: number
  unread_conversations: number
  latest: {
    conversation_id: number
    student_name: string | null
    preview: string | null
    last_message_at: string | null
  } | null
}
