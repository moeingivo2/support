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

    /**
     * برچسب‌های اینجا با `STATUS_LABELS` فرنت یکی است؛ اگر یکی عوض شود و
     * دیگری نه، دانشجو یک وضعیت را با دو اسم مختلف می‌بیند — یکی در اعلان و
     * یکی در فهرست.
     */
    public function label(): string
    {
        return match ($this) {
            self::Open => 'در انتظار بررسی',
            self::InProgress => 'در حال پیگیری',
            self::Resolved => 'رسیدگی‌شده',
        };
    }

    /**
     * آیا هنوز در شمارشِ «باز»ِ نشان قرمز می‌آید؟
     *
     * فقط «در انتظار بررسی» و «در حال پیگیری»؛ رسیدگی‌شده دیگر کاری برای
     * پنل ندارد.
     */
    public function isOutstanding(): bool
    {
        return $this !== self::Resolved;
    }
}
