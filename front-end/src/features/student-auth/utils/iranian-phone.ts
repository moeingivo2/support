/**
 * نرمال‌سازی و اعتبارسنجی شماره موبایل ایران.
 *
 * ورودی‌های مجاز: 09xxxxxxxxx و 989xxxxxxxxx
 * (به‌همراه پیشوندهای +98 و 0098 و ارقام فارسی)
 *
 * این منطق آینه‌ی App\Support\IranianPhone است؛ سرور منبع حقیقت است و
 * این لایه فقط برای بازخورد فوری به کاربر است.
 */

const PERSIAN_TO_ENGLISH_DIGITS: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
};

const SUPPORTED_FORMATS = /^(?:\+98|0098|98|0)?(9\d{9})$/;

export function toEnglishDigits(value: string): string {
    return value.replace(/[۰-۹٠-٩]/g, (digit) =>
        PERSIAN_TO_ENGLISH_DIGITS[digit] ?? digit,
    );
}

/**
 * تبدیل ورودی کاربر به فرم نرمال 989xxxxxxxxx یا null اگر نامعتبر باشد.
 */
export function normalizeIranianPhone(input: string): string | null {
    const digits = toEnglishDigits(input).replace(/[\s\-()_]/g, "");
    const match = SUPPORTED_FORMATS.exec(digits);

    return match ? `98${match[1]}` : null;
}

export function isValidIranianPhone(input: string): boolean {
    return normalizeIranianPhone(input) !== null;
}

/**
 * نمایش خوانا با صفر ابتدایی برای نمایش به کاربر.
 */
export function formatIranianPhone(value: string): string {
    const normalized = normalizeIranianPhone(value) ?? toEnglishDigits(value);
    const local = /^98(9\d{9})$/.exec(normalized);

    return local ? `0${local[1]}` : normalized;
}

/**
 * قالب‌بندی زنده ورودی: 0912 345 6789
 *
 * تایپ کردن با 98 یا +98 پشتیبانی می‌شود و بدون قالب نمایش داده می‌شود
 * تا کاربر بتواند پیشوند کشور را راحت تایپ کند.
 */
export function maskIranianPhoneInput(value: string): string {
    const digits = toEnglishDigits(value).replace(/\D/g, "").slice(0, 13);

    if (/^(?:\+98|0098|98)/.test(digits)) {
        return digits;
    }

    const local = digits.slice(0, 11);

    return [local.slice(0, 4), local.slice(4, 7), local.slice(7, 11)]
        .filter(Boolean)
        .join(" ");
}

export const IRANIAN_PHONE_ERROR = "شماره موبایل معتبر نیست. نمونه: ۰۹۱۲۳۴۵۶۷۸۹";
