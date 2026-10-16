<?php

namespace App\Support;

/**
 * وضعیت رسیدگی به نارضایتی.
 *
 * مقادیر همان سه مقدار قبلیِ `complaints` و `mentor_feedback` است تا
 * رکوردهای موجود و گزارش‌های قبلی هم‌خوان بمانند.
 */
enum ComplaintStatus: string
{
    case Open = 'open';
    case InProgress = 'in_progress';
    case Resolved = 'resolved';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'باز',
            self::InProgress => 'در حال بررسی',
            self::Resolved => 'رسیدگی‌شده',
        };
    }

    /**
     * آیا هنوز در شمارشِ «باز»ِ نشان قرمز می‌آید؟
     *
     * فقط باز و در حال بررسی؛ رسیدگی‌شده دیگر کاری برای پنل ندارد.
     */
    public function isOutstanding(): bool
    {
        return $this !== self::Resolved;
    }
}
