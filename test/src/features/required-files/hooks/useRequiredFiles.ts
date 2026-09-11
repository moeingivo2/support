import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getRequiredFiles, requiredFileKeys } from '../services/resourceService'
import type { RequiredFilesFilters } from '../services/resourceService'

export function useRequiredFiles(filters: RequiredFilesFilters) {
  return useQuery({
    queryKey: requiredFileKeys.list(filters),
    queryFn: () => getRequiredFiles(filters),
    placeholderData: keepPreviousData,
  })
}
