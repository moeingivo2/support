import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getSessionSources, sessionSourceKeys } from '../services/resourceService'
import type { SessionSourcesFilters } from '../services/resourceService'

export function useSessionSources(filters: SessionSourcesFilters) {
  return useQuery({
    queryKey: sessionSourceKeys.list(filters),
    queryFn: () => getSessionSources(filters),
    placeholderData: keepPreviousData,
  })
}
