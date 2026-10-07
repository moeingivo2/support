import { safeShiftDuration } from "@/shared/lib/shift-datetime";

/** مدت شیفت گزارش‌شده؛ شیفت باز «در حال انجام» و ورودی نامعتبر «—». */
export function formatShiftDuration(
    startTime: string,
    endTime: string | null,
): string {
    return safeShiftDuration(startTime, endTime, "در حال انجام");
}