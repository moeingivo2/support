import { safeShiftDuration } from "@/shared/lib/shift-datetime";

/** مدت شیفت تا لحظه‌ی حال؛ ورودی نامعتبر «—» می‌دهد. */
export function formatShiftDuration(
    startTime: string,
    endTime: string | null,
): string {
    return safeShiftDuration(startTime, endTime);
}