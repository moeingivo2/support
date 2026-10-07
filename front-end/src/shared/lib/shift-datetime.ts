/**
 * قالب‌بندی تاریخ و ساعت شیفت‌ها.
 *
 * مقادیر شیفت دو جنس متفاوت دارند: زمان شروع/پایان شیفت یک timestamp است،
 * ولی بازه‌ی تقسیم‌شده‌ی تیم (`shift_schedules.starts_at`) فقط ساعت دارد و
 * چیزی مثل «08:00:00» است. `new Date("08:00:00")` تاریخ نامعتبر می‌دهد و
 * `Intl.DateTimeFormat.format` روی آن `RangeError: Invalid time value`
 * می‌اندازد که کل صفحه را می‌شکند. این توابع هر ورودی نامعتبر یا خالی را
 * تحمل می‌کنند و به‌جای کرش، «—» برمی‌گردانند.
 */

const TIME_ONLY = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** مقدار «خالی» برای تاریخ/ساعتی که قابل نمایش نیست. */
const EMPTY_VALUE = "—";

/** برچسبی که برای شیفت باز (بدون زمان پایان) نشان داده می‌شود. */
const OPEN_LABEL = "در حال انجام";

/**
 * رشته را به تاریخ معتبر تبدیل می‌کند؛ اگر ممکن نباشد `null` می‌دهد.
 * بازه‌های فقط‌ساعت روی یک روز ثابت نگاشته می‌شوند تا ساعتشان درست بماند.
 */
export function parseShiftDateTime(
    value: string | null | undefined,
): Date | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (trimmed === "") {
        return null;
    }

    const timeOnly = TIME_ONLY.exec(trimmed);
    if (timeOnly) {
        const [, hours, minutes] = timeOnly;
        return new Date(2000, 0, 1, Number(hours), Number(minutes));
    }

    const parsed = new Date(trimmed);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const timeFormatter = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" });

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "long",
    timeStyle: "short",
});

/** ساعت یک شیفت؛ بازه‌ی فقط‌ساعت («08:00:00») هم درست نمایش داده می‌شود. */
export function safeShiftTime(value: string | null | undefined): string {
    const parsed = parseShiftDateTime(value);

    return parsed === null ? EMPTY_VALUE : timeFormatter.format(parsed);
}

/** تاریخ بلند یک شیفت؛ ورودی نامعتبر «—» می‌دهد. */
export function safeShiftDate(value: string | null | undefined): string {
    const parsed = parseShiftDateTime(value);

    return parsed === null ? EMPTY_VALUE : dateFormatter.format(parsed);
}

/** تاریخ و ساعت با هم؛ ورودی نامعتبر «—» می‌دهد. */
export function safeShiftDateTime(value: string | null | undefined): string {
    const parsed = parseShiftDateTime(value);

    return parsed === null ? EMPTY_VALUE : dateTimeFormatter.format(parsed);
}

/**
 * مدت شیفت را به «۲ ساعت و ۵ دقیقه» تبدیل می‌کند.
 *
 * زمان شروع نامعتبر → «—». اگر زمان پایان خالی باشد، مدت تا لحظه‌ی حال
 * حساب می‌شود؛ مگر اینکه `openLabel` داده شود که در آن صورت همان برچسب
 * (مثل «در حال انجام») برگردانده می‌شود.
 */
export function safeShiftDuration(
    startValue: string | null | undefined,
    endValue: string | null | undefined,
    openLabel: string | null = null,
): string {
    const start = parseShiftDateTime(startValue);
    if (start === null) {
        return EMPTY_VALUE;
    }

    if (!endValue) {
        return (
            openLabel ??
            describeMinutes(minutesBetween(start.getTime(), Date.now()))
        );
    }

    const end = parseShiftDateTime(endValue);
    if (end === null) {
        return openLabel ?? OPEN_LABEL;
    }

    return describeMinutes(minutesBetween(start.getTime(), end.getTime()));
}

function minutesBetween(startMs: number, endMs: number): number {
    return Math.max(0, Math.round((endMs - startMs) / 60_000));
}

/** دقیقه را به «۲ ساعت و ۵ دقیقه» یا «۰ دقیقه» تبدیل می‌کند. */
export function describeMinutes(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours.toLocaleString("fa-IR")} ساعت`);
    }

    if (minutes > 0) {
        parts.push(`${minutes.toLocaleString("fa-IR")} دقیقه`);
    }

    return parts.length > 0 ? parts.join(" و ") : "۰ دقیقه";
}