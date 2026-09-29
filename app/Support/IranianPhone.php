<?php

namespace App\Support;

/**
 * نرمال‌سازی شماره موبایل ایران.
 * ورودی‌های مجاز: 09xxxxxxxxx و 989xxxxxxxxx (و ۰۹۹۹… به‌صورت فارسی)
 * خروجی ذخیره‌سازی همیشه به فرم 989xxxxxxxxx است.
 */
final class IranianPhone
{
    private const PATTERN = '/^(?:\+98|0098|98|0)?(9\d{9})$/';

    /**
     * تبدیل ورودی کاربر به فرم نرمال 989xxxxxxxxx
     */
    public static function normalize(string $input): ?string
    {
        $digits = self::toEnglishDigits($input);
        $digits = preg_replace('/[\s\-()_]/', '', $digits) ?? '';

        if (preg_match(self::PATTERN, $digits, $matches) !== 1) {
            return null;
        }

        return '98'.$matches[1];
    }

    /**
     * نمایش خوانا با صفر ابتدایی
     */
    public static function display(string $normalized): string
    {
        if (preg_match('/^98(9\d{9})$/', $normalized, $matches) === 1) {
            return '0'.$matches[1];
        }

        return $normalized;
    }

    public static function isValid(string $input): bool
    {
        return self::normalize($input) !== null;
    }

    public static function toEnglishDigits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }
}
