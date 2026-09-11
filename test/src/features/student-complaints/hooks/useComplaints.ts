import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getComplaints, getMyComplaints, complaintKeys } from '../services/complaint-service'

export function useComplaints(page: number, tab: 'all' | 'mine') {
  const isMine = tab === 'mine'
  return useQuery({
    queryKey: isMine ? complaintKeys.mine(page) : complaintKeys.list(page),
    queryFn: () => (isMine ? getMyComplaints(page) : getComplaints(page)),
    placeholderData: keepPreviousData,
  })
}
