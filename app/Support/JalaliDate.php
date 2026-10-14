<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeInterface;
use InvalidArgumentException;

/**
 * تبدیل تاریخ میلادی به شمسی، بدون وابستگی بیرونی.
 *
 * چرا دستی نوشته شده: افزونه‌ی ‎intl‎ نه روی ماشین توسعه نصب است و نه در
 * ایمیج Docker پروژه، و افزودن پکیج Composer هم نیاز به تأیید دارد. چون
 * فقط اکسل‌ها تاریخ شمسی نشان می‌دهند و دیتابیس باید میلادی بماند، تبدیل
 * در همین لایه‌ی نمایش کافی است.
 *
 * الگوریتم همانِ مرجعِ jalaali-js است: کبیسه‌بودن سال از راه جست‌وجوی
 * دوشاخه در فهرست شکست‌ها محاسبه می‌شود که برای سال‌های ‎-61‎ تا ‎3177‎
 * شمسی دقیق است.
 */
final readonly class JalaliDate
{
    /**
     * سال‌هایی که الگوریتم کبیسه در آن‌ها شکست می‌خورد.
     *
     * @var array<int, int>
     */
    private const BREAKS = [
        -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
        1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
    ];

    /**
     * شماره‌ی روز ژولیَن یک تاریخ میلادی.
     */
    private static function gregorianToDayNumber(int $gy, int $gm, int $gd): int
    {
        $value = self::truncDiv(1461 * ($gy + self::truncDiv($gm - 8, 6) + 100100), 4)
            + self::truncDiv(153 * self::truncMod($gm + 9, 12) + 2, 5)
            + $gd
            - 34_840_408;

        return $value - self::truncDiv(3 * self::truncDiv($gy + 100100 + self::truncDiv($gm - 8, 6), 100), 4) + 752;
    }

    /**
     * مشخصات تقویم یک سال شمسی.
     *
     * @return array{leap: int, gy: int, march: int}
     */
    private static function jalaliCalendar(int $jy): array
    {
        $breaks = self::BREAKS;
        $last = count($breaks) - 1;

        if ($jy < $breaks[0] || $jy >= $breaks[$last]) {
            throw new InvalidArgumentException("سال شمسی نامعتبر است: {$jy}");
        }

        $gy = $jy + 621;
        $leapJ = -14;
        $jp = $breaks[0];
        $jump = 0;

        for ($i = 1; $i <= $last; $i++) {
            $jm = $breaks[$i];
            $jump = $jm - $jp;

            if ($jy < $jm) {
                break;
            }

            $leapJ += 8 * self::truncDiv($jump, 33)
                + self::truncDiv(self::truncMod($jump, 33), 4);
            $jp = $jm;
        }

        $n = $jy - $jp;

        $leapJ += 8 * self::truncDiv($n, 33)
            + self::truncDiv(self::truncMod($n, 33) + 3, 4);

        if (self::truncMod($jump, 33) === 4 && $jump - $n === 4) {
            $leapJ++;
        }

        // روزِ نوروز در سال میلادی متناظر
        $march = 20 + $leapJ
            - (self::truncDiv($gy, 4) - self::truncDiv(3 * (self::truncDiv($gy, 100) + 1), 4) - 150);

        if ($jump - $n < 6) {
            $n = $n - $jump + 33 * self::truncDiv($jump + 4, 33);
        }

        $leap = self::truncMod(self::truncMod($n + 1, 33) - 1, 4);

        if ($leap === -1) {
            $leap = 4;
        }

        return ['leap' => $leap, 'gy' => $gy, 'march' => $march];
    }

    /**
     * بخش‌های شمسی یک تاریخ میلادی.
     *
     * @return array{year: int, month: int, day: int}
     */
    public static function fromGregorian(int $gy, int $gm, int $gd): array
    {
        $jy = $gy - 621;
        $calendar = self::jalaliCalendar($jy);

        $nowruz = self::gregorianToDayNumber($calendar['gy'], 3, $calendar['march']);
        $day = self::gregorianToDayNumber($gy, $gm, $gd) - $nowruz;

        if ($day >= 0) {
            if ($day <= 185) {
                return [
                    'year' => $jy,
                    'month' => 1 + self::truncDiv($day, 31),
                    'day' => self::truncMod($day, 31) + 1,
                ];
            }

            $day -= 186;
        } else {
            $jy--;
            $day += 179;

            // سال کبیسه ۳۰ روزِ اسفند دارد، پس روزِ منفی یکی جلوتر می‌افتد.
            if ($calendar['leap'] === 1) {
                $day++;
            }
        }

        return [
            'year' => $jy,
            'month' => 7 + self::truncDiv($day, 30),
            'day' => self::truncMod($day, 30) + 1,
        ];
    }

    /**
     * تعداد روزهای یک ماه شمسی.
     *
     * ماه‌های ۱ تا ۶ سی روز، ۷ تا ۱۱ سی روز، و اسفند ۳۰ روز در سال کبیسه و
     * ۲۹ روز در سال عادی. در رمزگذاری این الگوریتم، مقدار ‎leap = 0‎ یعنی
     * سال کبیسه است.
     */
    public static function daysInMonth(int $year, int $month): int
    {
        if ($month <= 6) {
            return 31;
        }

        if ($month <= 11) {
            return 30;
        }

        return self::jalaliCalendar($year)['leap'] === 0 ? 30 : 29;
    }

    /** «۱۴۰۵/۰۷/۲۲» — برچسب تاریخ در اکسل. */
    public static function format(?DateTimeInterface $date): string
    {
        if ($date === null) {
            return '—';
        }

        $parts = self::fromGregorian(
            (int) $date->format('Y'),
            (int) $date->format('n'),
            (int) $date->format('j'),
        );

        return self::digits(sprintf('%04d/%02d/%02d', $parts['year'], $parts['month'], $parts['day']));
    }

    /** «۱۴۰۵/۰۷/۲۲ ۱۴:۳۰» — تاریخ و ساعت با هم. */
    public static function formatWithTime(?DateTimeInterface $date): string
    {
        if ($date === null) {
            return '—';
        }

        return self::format($date).' '.self::digits($date->format('H:i'));
    }

    /** «۱۴۰۵/۰۷/۲۲» از روی رشته‌ی میلادی (ورودی فرم‌ها و بازه‌ها). */
    public static function formatFromString(?string $value): string
    {
        if ($value === null || trim($value) === '') {
            return '—';
        }

        try {
            return self::format(CarbonImmutable::parse($value));
        } catch (\Throwable) {
            return '—';
        }
    }

    /** تبدیل ارقام لاتین به فارسی. */
    public static function digits(string $value): string
    {
        return strtr($value, [
            '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴',
            '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹',
        ]);
    }

    /**
     * تقسیم صحیح با قطع به سمت صفر.
     *
     * PHP برای اعداد منفی گرد کردن به سمت پایین می‌کند و این محاسبه‌ی
     * روز ژولیَن را یک روز جابه‌جا می‌کند، پس باید صریحاً قطع کنیم.
     */
    private static function truncDiv(int $a, int $b): int
    {
        return (int) ($a / $b);
    }

    /** باقی‌مانده‌ی متناظر با {@see self::truncDiv()} (همیشه صفر تا ‎b-1‎). */
    private static function truncMod(int $a, int $b): int
    {
        return $a - self::truncDiv($a, $b) * $b;
    }
}
