import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/shared/api/http";
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

export const studentComplaintKeys = {
    all: ["student-complaints"] as const,
    mine: ["student-complaints", "mine"] as const,
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

/**
 * نارضایتی‌های خود دانشجو.
 *
 * پنل دانشجو این را چند وقت یک‌بار دوباره می‌خواند تا تغییر وضعیتی که در
 * پنل سوپر ادمین داده شده را خودش تشخیص دهد؛ لازم نیست رابطِ کاربریِ
 * جداگانه‌ای برای اعلان نگه داریم.
 */
export function useMyComplaints() {
    return useQuery({
        queryKey: studentComplaintKeys.mine,
        queryFn: () =>
            getJson<{ data: MyComplaint[] }>("/api/student/complaints").then(
                (response) => response.data,
            ),
        refetchInterval: 60_000,
    });
}