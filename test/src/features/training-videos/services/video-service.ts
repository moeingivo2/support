import { deleteJson, getJson, postJson, putJson } from '@/shared/api/http'
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

export type VideoPayload = {
  title: string
  description: string
  video_url: string
  category: string | null
}

export async function createVideo(
  payload: VideoPayload,
): Promise<{ message: string; video: EducationalVideo }> {
  return postJson<VideoPayload, { message: string; video: EducationalVideo }>('/api/videos', payload)
}

export async function updateVideo(
  id: number,
  payload: VideoPayload,
): Promise<{ message: string; video: EducationalVideo }> {
  return putJson<VideoPayload, { message: string; video: EducationalVideo }>(
    `/api/videos/${id}`,
    payload,
  )
}

export async function deleteVideo(id: number): Promise<{ message: string }> {
  return deleteJson<{ message: string }>(`/api/videos/${id}`)
}
