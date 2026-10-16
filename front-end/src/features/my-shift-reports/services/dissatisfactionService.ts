import { postJson } from "@/shared/api/http";
import type { ShiftReport } from "../types/shiftReport";

export type DismissRatingResponse = {
    message: string;
    /** شمارشِ تازه‌ی گزارش شیفت، اگر گزارشی وجود داشته باشد. */
    report: {
        shift_report_id: number;
        unsatisfied_students_count: number;
    } | null;
};

/**
 * کنار گذاشتنِ نارضایتیِ بی‌ربط.
 *
 * رکورد امتیاز حذف نمی‌شود؛ فقط از شمارشِ «دانشجویان ناراضی» بیرون می‌رود
 * و در نتیجه هم گزارش شیفت و هم ستون «دانشجویان ناراضی» در اکسل فعالیت
 * بلافاصله اصلاح می‌شوند.
 */
export function dismissDissatisfaction(
    ratingId: number,
): Promise<DismissRatingResponse> {
    return postJson<Record<string, never>, DismissRatingResponse>(
        `/api/message-ratings/${ratingId}/dismiss`,
        {},
    );
}

/** برگرداندنِ نارضایتی‌ای که اشتباهی کنار گذاشته شده بود. */
export function restoreDissatisfaction(
    ratingId: number,
): Promise<DismissRatingResponse> {
    return postJson<Record<string, never>, DismissRatingResponse>(
        `/api/message-ratings/${ratingId}/restore`,
        {},
    );
}

export type { ShiftReport };