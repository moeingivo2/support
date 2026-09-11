import { getJson } from '@/shared/api/http'
import type { EducationalVideo } from '../types/video'

export const videoKeys = {
  all: ['videos'] as const,
  list: (category?: string, search?: string) =>
    [...videoKeys.all, 'list', { category, search }] as const,
}

export function getVideos(params: { category?: string; search?: string } = {}): Promise<EducationalVideo[]> {
  return getJson<EducationalVideo[]>('/api/videos', {
    category: params.category || undefined,
    search: params.search || undefined,
  })
}
