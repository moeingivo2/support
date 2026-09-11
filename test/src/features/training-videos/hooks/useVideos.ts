import { useQuery } from '@tanstack/react-query'
import { videoKeys, getVideos } from '../services/video-service'

export function useVideos(category: string, search: string) {
  return useQuery({
    queryKey: videoKeys.list(category, search),
    queryFn: () => getVideos({ category, search }),
  })
}
