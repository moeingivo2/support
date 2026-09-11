export interface Faq {
  id: number
  question: string
  answer: string
  category: string | null
  order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
