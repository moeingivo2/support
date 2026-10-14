/**
 * تبدیل و قالب‌بندی تاریخ شمسی (هجری خورشیدی).
 *
 * سرور همه‌چیز را میلادی نگه می‌دارد (`Y-m-d`) و این عمدی است: تاریخ
 * شمسی تقویم محاسباتی نیست و نگه‌داشتن آن در دیتابیس باعث می‌شود
 * مقایسه، مرتب‌سازی و بازه‌ها به‌هم بخورند. تبدیل فقط در لایه‌ی نمایش
 * انجام می‌شود.
 *
 * برای تبدیل از تقویمِ خود مرورگر استفاده می‌شود
 * (`Intl.DateTimeFormat` با ‎ca-persian‎) تا نیازی به افزودن وابستگی
 * نباشد. این API در Chrome، Firefox و Safari پشتیبانی می‌شود.
 */

import { toPersianDigits } from "@/features/student-chat/utils/persian";

/** نام ماه‌های شمسی، از فروردین تا اسفند. */
const JALALI_MONTHS = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
] as const;

const WEEKDAYS = [
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
    "شنبه",
] as const;

/** مقدارِ «خالی» برای تاریخی که قابل نمایش نیست. */
export const EMPTY_DATE = "—";

/**
 * تنظیمات تبدیل میلادی → شمسی.
 *
 * ‎latn‎ ارقام را لاتین نگه می‌دارد تا بعداً `toPersianDigits` آن‌ها را
 * فارسی کند؛ اگر مستقیم ‎fa-IR‎ بدهیم خروجی شامل اسم ماه فارسی و ارقام
 * فارسی قاطی می‌شود که برای ساختن مقدار قابل‌پردازش (ورودی بازه‌ها)
 * به‌درد نمی‌خورد.
 *
 * ‎timeZone: 'UTC'‎ حیاتی است: همه‌ی محاسباتِ تبدیل با تاریخ‌های UTC
 * انجام می‌شود. اگر این قالب با منطقه‌ی زمانی محلی ساخته شود و بعد با
 * تاریخ UTC به آن داده شود، نتیجه یک روز جلو/عقب می‌افتد.
 */
const persianParts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
});

const jalaliLongFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "long",
});

const jalaliDateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "long",
    timeStyle: "short",
});

const jalaliTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});

export type JalaliDate = {
    /** سال شمسی، مثل ‎1405‎ */
    year: number;
    /** ماه شمسی، ۱ (فروردین) تا ۱۲ (اسفند) */
    month: number;
    /** روز شمسی، ۱ تا ۳۱ */
    day: number;
};

/**
 * رشته/تاریخ را به `Date` معتبر تبدیل می‌کند.
 *
 * رشته‌های فقط‌تاریخ (‎YYYY-MM-DD‎) عمداً با ‎T00:00:00 محلی‎ ساخته
 * می‌شوند نه UTC، وگرنه در نیم‌کره‌ی شرقی یک روز عقب می‌افتند.
 */
export function toDate(value: string | number | Date | null | undefined): Date | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "number") {
        const fromNumber = new Date(value);
        return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
    }

    const trimmed = value.trim();

    // ‎YYYY-MM-DD‎ بدون ساعت: محلی، نه UTC.
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

    if (dateOnly) {
        const [, year, month, day] = dateOnly;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(trimmed);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** بخش‌های عددی تاریخ شمسی یک لحظه‌ی مشخص. */
export function toJalaliParts(date: Date): JalaliDate {
    const parts = persianParts.formatToParts(date);
    const pick = (type: "year" | "month" | "day"): number => {
        const found = parts.find((part) => part.type === type);
        return Number(found?.value ?? "0");
    };

    return {
        year: pick("year"),
        month: pick("month"),
        day: pick("day"),
    };
}

/** تاریخ شمسیِ امروز. */
export function todayJalali(): JalaliDate {
    return toJalaliParts(new Date());
}

/**
 * عددِ روز را با صفرهای ابتدایی می‌نویسد: ‎1‎ → ‎"01"‎.
 *
 * در ورودی عددی (نه نمایشی) ارقام باید لاتین بمانند تا
 * {@link jalaliToGregorian} بتواند دوباره بخواندشان.
 */
export function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

/** نام ماه شمسی؛ ماهِ نامعتبر به اسفند برمی‌گردد. */
export function jalaliMonthName(month: number): string {
    return JALALI_MONTHS[month - 1] ?? JALALI_MONTHS[11];
}

/**
 * «۲۲ مهر ۱۴۰۵»
 *
 * برای نمایش در رابط کاربری. ورودی نامعتبر → {@link EMPTY_DATE}.
 */
export function formatJalaliDate(value: string | number | Date | null | undefined): string {
    const date = toDate(value);

    return date === null
        ? EMPTY_DATE
        : toPersianDigits(jalaliLongFormatter.format(date));
}

/**
 * «۲۲ مهر ۱۴۰۵، ۱۴:۳۰» — تاریخ و ساعت با هم.
 */
export function formatJalaliDateTime(value: string | number | Date | null | undefined): string {
    const date = toDate(value);

    return date === null
        ? EMPTY_DATE
        : toPersianDigits(jalaliDateTimeFormatter.format(date));
}

/** فقط ساعت: «۱۴:۳۰». تاریخ اینجا شمسی می‌ماند چون فقط ساعت است. */
export function formatJalaliTime(value: string | number | Date | null | undefined): string {
    const date = toDate(value);

    return date === null
        ? EMPTY_DATE
        : toPersianDigits(jalaliTimeFormatter.format(date));
}

/** نام روز هفته: «دوشنبه». */
export function formatJalaliWeekday(value: string | number | Date | null | undefined): string {
    const date = toDate(value);

    return date === null ? EMPTY_DATE : (WEEKDAYS[date.getDay()] ?? EMPTY_DATE);
}

/**
 * تاریخ شمسی را به مقدار میلادیِ قابل‌ارسال تبدیل می‌کند (`YYYY-MM-DD`).
 *
 * سرور بازه‌ها را با `date_format:Y-m-d` اعتبارسنجی می‌کند، پس از
 * انتخاب تاریخ شمسی باید همین قالب فرستاده شود.
 *
 * ورودی نامعتبر `null` می‌دهد تا فراخوان بتواند اعتبارسنجی را رد کند.
 */
export function jalaliToGregorian(
    year: number,
    month: number,
    day: number,
): string | null {
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    const firstDay = gregorianForJalali(year, month, 1);

    if (firstDay === null) {
        return null;
    }

    // UTC در سراسر این تابع نگه داشته می‌شود: ساختن تاریخِ محلی و بعد
    // قالب‌بندیِ UTC، در هر منطقه‌ی زمانیِ جلوتر از UTC یک روز عقب می‌اندازد.
    const target = new Date(
        Date.UTC(
            firstDay.getUTCFullYear(),
            firstDay.getUTCMonth(),
            firstDay.getUTCDate() + (day - 1),
        ),
    );

    return (
        `${target.getUTCFullYear()}-${pad2(target.getUTCMonth() + 1)}-` +
        `${pad2(target.getUTCDate())}`
    );
}

/**
 * مبدأی تقریبی برای رسیدن به یک تاریخ شمسی مشخص.
 *
 * سال شمسی Y تقریباً هم‌ترازِ مارسِ سال میلادی Y + 621 است، پس از
 * اوّل مارسِ آن سال شروع می‌کنیم و روزبه‌روز جلو می‌رویم تا به هدف
 * برسیم. این کار حداکثر ~۴۰۰ روز طول می‌کشد.
 */
function gregorianForJalali(
    year: number,
    month: number,
    day: number,
): Date | null {
    const rough = new Date(Date.UTC(year + 621, 2, 20));
    let current = toJalaliParts(rough);
    let guard = 0;

    while (compareJalali(current, year, month, day) < 0 && guard < 800) {
        rough.setUTCDate(rough.getUTCDate() + 1);
        current = toJalaliParts(rough);
        guard++;
    }

    while (compareJalali(current, year, month, day) > 0 && guard < 1600) {
        rough.setUTCDate(rough.getUTCDate() - 1);
        current = toJalaliParts(rough);
        guard++;
    }

    if (compareJalali(current, year, month, day) !== 0) {
        return null;
    }

    return rough;
}

/** مقایسه‌ی دو تاریخ شمسی: منفی یعنی `left` زودتر است. */
function compareJalali(
    left: JalaliDate,
    year: number,
    month: number,
    day: number,
): number {
    if (left.year !== year) {
        return left.year - year;
    }

    if (left.month !== month) {
        return left.month - month;
    }

    return left.day - day;
}

/**
 * مقدار `YYYY-MM-DD` میلادی را به بخش‌های شمسی تبدیل می‌کند.
 *
 * ورودیِ `null`/`undefined` یعنی «تاریخی انتخاب نشده» و خروجی هم `null`
 * است تا {@link JalaliDateInput} بتواند خالی بماند.
 */
export function gregorianToJalali(value: string | null | undefined): JalaliDate | null {
    const date = toDate(value);

    return date === null ? null : toJalaliParts(date);
}

/**
 * بخش‌های شمسی را به عدد قابل‌نمایش تبدیل می‌کند: ‎"۱۴۰۵/۰۷/۲۲"‎.
 *
 * ارقام فارسی پذیرفته می‌شوند چون کاربر همان را در ورودی می‌بیند.
 */
export function parseJalaliDigits(value: string): number {
    const normalised = value
        .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
        .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));

    return Number(normalised.replace(/[^\d]/g, ""));
}

/** کل `Date` برای ابتدای یک روز شمسی. */
export function startOfJalaliDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * نمایش «دیروز» / «امروز» / «۲ روز پیش» برای تاریخ‌های اخیر، وگرنه تاریخ کامل.
 *
 * این الگو در فهرست گفتگوها استفاده می‌شود و بهتر از نمایش تاریخ خام است
 * چون کاربر بیشتر با «امروز» سروکار دارد.
 */
export function formatRelativeJalali(value: string | number | Date | null | undefined): string {
    const date = toDate(value);

    if (date === null) {
        return "بدون پیام";
    }

    const today = startOfJalaliDay(new Date());
    const target = startOfJalaliDay(date);
    const dayDifference = Math.round(
        (today.getTime() - target.getTime()) / 86_400_000,
    );

    if (dayDifference === 0) {
        return formatJalaliTime(date);
    }

    if (dayDifference === 1) {
        return "دیروز";
    }

    if (dayDifference === 2) {
        return "پریروز";
    }

    return formatJalaliDate(date);
}