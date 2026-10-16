import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    complaintKeys,
    createComplaint,
    deleteComplaint,
    getComplaintSummary,
    getComplaints,
    markComplaintsSeen,
    updateComplaintStatus,
} from "../services/complaint-service";
import type {
    ComplaintFilters,
    ComplaintStatus,
    CreateComplaintPayload,
} from "../types/complaint";

/** فهرست پنل با فیلتر نوع/وضعیت/بازه‌ی زمانی. */
export function useComplaints(filters: ComplaintFilters) {
    return useQuery({
        queryKey: complaintKeys.list(filters),
        queryFn: () => getComplaints(filters),
        placeholderData: keepPreviousData,
    });
}

/**
 * شمارش نشان قرمز.
 *
 * این کوئری جدا از فهرست است تا باز و بسته کردن فیلترها باعث
 * ری‌کوئری نشدن شمارنده نشود. برای نقش‌هایی که نارضایتی نمی‌بینند
 * (مثل کارآموز) باید `enabled` خاموش شود تا اصلاً درخواستی نرود.
 */
export function useComplaintSummary(
    options: { enabled?: boolean } = {},
) {
    return useQuery({
        queryKey: complaintKeys.summary,
        queryFn: getComplaintSummary,
        enabled: options.enabled ?? true,
        refetchInterval: 60_000,
    });
}

export function useCreateComplaint() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateComplaintPayload) =>
            createComplaint(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: complaintKeys.all });
        },
    });
}

export function useUpdateComplaintStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: number; status: ComplaintStatus }) =>
            updateComplaintStatus(id, status),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: complaintKeys.all });
        },
    });
}

export function useDeleteComplaint() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteComplaint(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: complaintKeys.all });
        },
    });
}

/**
 * علامت‌زدن «دیده‌شده» وقتی پنل باز می‌شود.
 *
 * این کار نشان قرمز را صفر می‌کند و فقط یک‌بار در هر ورود به صفحه
 * اجرا می‌شود.
 */
export function useMarkComplaintsSeen() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markComplaintsSeen,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: complaintKeys.all });
        },
    });
}