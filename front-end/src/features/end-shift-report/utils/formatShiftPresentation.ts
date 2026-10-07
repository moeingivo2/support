import {
    safeShiftDate,
    safeShiftDuration,
    safeShiftTime,
} from "@/shared/lib/shift-datetime";

/**
 * ساعت شروع/پایان شیفت. بازه‌های فقط‌ساعت («08:00:00») و مقادیر خالی هم
 * درست و بی‌خطر نمایش داده می‌شوند؛ پیش از این `Intl` روی تاریخ نامعتبر
 * `RangeError` می‌داد و صفحه‌ی داشبورد را می‌شکست.
 */
export function formatShiftTime(date: string): string {
    return safeShiftTime(date);
}

export function formatShiftDate(date: string): string {
    return safeShiftDate(date);
}

export function formatShiftChannel(channel: string): string {
    const channelLabels: Record<string, string> = {
        web: "وب",
        ai: "هوش مصنوعی",
        phone: "تلفنی",
        mobile: "موبایل",
    };

    return channelLabels[channel] ?? "نامشخص";
}

export function formatShiftDuration(
    startTime: string,
    endTime: string | null,
): string {
    return safeShiftDuration(startTime, endTime);
}