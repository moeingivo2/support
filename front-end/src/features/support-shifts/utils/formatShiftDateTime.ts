import { safeShiftDateTime } from "@/shared/lib/shift-datetime";

/** تاریخ و ساعت شیفت؛ ورودی خالی یا نامعتبر «—» می‌دهد. */
export function formatShiftDateTime(date: string): string {
    return safeShiftDateTime(date);
}