import { toPersianDigits } from "@/features/student-chat/utils/persian";
import {
    EMPTY_DATE,
    formatJalaliDate,
    formatJalaliTime,
    formatRelativeJalali,
} from "@/shared/lib/jalali";

/**
 * قالب‌بندی تاریخ گفتگو.
 *
 * لایه‌ی تبدیل به تقویم شمسی در `@/shared/lib/jalali` متمرکز است؛ این
 * فایل فقط الگوی نمایشِ هر جایگاه را نگه می‌دارد. قبلاً هر فایل
 * ‎Intl.DateTimeFormat("fa-IR")‎ خودش را می‌ساخت و همه جا جدا از هم
 * تغییر می‌کردند.
 */

/** فقط ساعتِ پیام: «۱۴:۳۰»؛ رشته‌ی خالی برمی‌گرداند تا «۰۰:۰۰» نشان داده نشود. */
export function formatMessageTime(isoDate: string | null): string {
    if (!isoDate) return "";
    return formatJalaliTime(isoDate);
}

/**
 * تاریخِ کنار هر گفتگو در فهرست.
 *
 * برای پیام‌های امروز فقط ساعت، دیروز/پریروز اسمشان، و بقیه تاریخ کامل
 * نشان داده می‌شود.
 */
export function formatConversationDate(isoDate: string | null): string {
    if (!isoDate) return "بدون پیام";
    return formatRelativeJalali(isoDate);
}

export function formatFileSize(bytes: number | null): string {
    if (!bytes) return "";
    const units = ["بایت", "کیلوبایت", "مگابایت"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${toPersianDigits(Math.round(value * 10) / 10)} ${units[unit]}`;
}

export function formatDuration(seconds: number | null): string {
    if (!seconds) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return toPersianDigits(`${minutes}:${String(rest).padStart(2, "0")}`);
}

/** تاریخ عضویت دانشجو در پنل. */
export function formatMembershipDate(isoDate: string | null): string {
    if (!isoDate) return EMPTY_DATE;
    return formatJalaliDate(isoDate);
}