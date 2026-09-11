export interface EducationalVideo {
  id: number
  title: string
  description: string | null
  video_url: string
  thumbnail_url: string | null
  category: string | null
  order: number
  is_active: boolean
  created_at: string
  updated_at: string
}
