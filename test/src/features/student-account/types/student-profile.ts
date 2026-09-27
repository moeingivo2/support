export type StudentProfilePayload = {
  user_id: number
  full_name: string
  email: string | null
  course: 'offline' | 'in_person' | 'school'
  course_label: string
  track: 'ai' | 'web' | null
  track_label: string | null
  purchased_sessions: number[]
  total_sessions: number
  total_chats: number
  used_chats: number
  remaining_chats: number
  remaining_percentage: number
  is_low_on_chats: boolean
  low_remaining_threshold: number
  mentor_name: string | null
  membership_date: string | null
}
