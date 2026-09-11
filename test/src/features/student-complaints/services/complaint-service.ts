import { getJson, postJson, putJson } from '@/shared/api/http'
import type {
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  CreateComplaintPayload,
  CreateComplaintResponse,
  LaravelPagination,
} from '../types/complaint'

export const complaintKeys = {
  all: ['complaints'] as const,
  list: (page: number) => [...complaintKeys.all, 'list', page] as const,
  mine: (page: number) => [...complaintKeys.all, 'mine', page] as const,
}

export function getComplaints(page: number): Promise<LaravelPagination<Complaint>> {
  return getJson<LaravelPagination<Complaint>>('/api/complaints', { page })
}

export function getMyComplaints(page: number): Promise<LaravelPagination<Complaint>> {
  return getJson<LaravelPagination<Complaint>>('/api/complaints/my', { page })
}

export function createComplaint(
  payload: CreateComplaintPayload,
): Promise<CreateComplaintResponse> {
  return postJson<CreateComplaintPayload, CreateComplaintResponse>('/api/complaints', payload)
}

export function updateComplaintStatus(
  id: number,
  status: ComplaintStatus,
): Promise<{ message: string; complaint: Complaint }> {
  return putJson<{ status: ComplaintStatus }, { message: string; complaint: Complaint }>(
    `/api/complaints/${id}`,
    { status },
  )
}

export const PRIORITY_LABELS: Record<ComplaintPriority | string, string> = {
  high: 'بالا',
  normal: 'متوسط',
  low: 'پایین',
}

export const STATUS_LABELS: Record<ComplaintStatus | string, string> = {
  open: 'باز',
  in_progress: 'در حال بررسی',
  resolved: 'حل‌شده',
}

export type { ComplaintStatus } from '../types/complaint'
