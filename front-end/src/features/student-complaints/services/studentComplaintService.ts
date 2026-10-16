import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJson, postJson } from "@/shared/api/http";
import type {
    ComplaintStatus,
    ComplaintType,
} from "../types/complaint";

/** نارضایتیِ خودِ دانشجو، همان‌طور که در فهرست به او نشان داده می‌شود. */
export type MyComplaint = {
    id: number;
    type: ComplaintType | (string & {});
    status: ComplaintStatus | (string & {});
    subject: string;
    description: string;
    created_at: string;
    updated_at: string;
};

export type ComplaintNotification = {
    id: number;
    complaint_id: number;
    title: string;
    body: string;
    status: ComplaintStatus | (string & {});
    read_at: string | null;
    created_at: string;
};

export type NotificationsResponse = {
    unread: number;
    data: ComplaintNotification[];
};

export const studentComplaintKeys = {
    all: ["student-complaints"] as const,
    mine: ["student-complaints", "mine"] as const,
    notifications: ["student-complaints", "notifications"] as const,
};

/**
 * وضعیت‌ها اینجا تکرار نمی‌شوند و از سرویس پنل گرفته می‌شوند تا برچسبِ
 * نارضایتی در پنل سوپر ادمین و در پنل دانشجو یکی بماند.
 */
export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
    open: "در انتظار بررسی",
    in_progress: "در حال پیگیری",
    resolved: "رسیدگی‌شده",
};

/** نارضایتی‌های خود دانشجو. */
export function useMyComplaints() {
    return useQuery({
        queryKey: studentComplaintKeys.mine,
        queryFn: () =>
            getJson<{ data: MyComplaint[] }>("/api/student/complaints").then(
                (response) => response.data,
            ),
    });
}

/**
 * اعلان‌های دانشجو.
 *
 * داده‌کم و سبک است، پس بازه‌ی تازه‌سازی کوتاه گذاشته شده تا تغییر وضعیت
 * در پنل سوپر ادمین زودتر به دانشجو برسد.
 */
export function useComplaintNotifications() {
    return useQuery({
        queryKey: studentComplaintKeys.notifications,
        queryFn: () =>
            getJson<NotificationsResponse>(
                "/api/student/complaint-notifications",
            ),
        refetchInterval: 60_000,
    });
}

/** علامت‌زدن اعلان‌ها به‌عنوان خوانده‌شده. */
export function useMarkNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () =>
            postJson<Record<string, never>, { message: string }>(
                "/api/student/complaint-notifications/read",
                {},
            ),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: studentComplaintKeys.notifications,
            });
        },
    });
}