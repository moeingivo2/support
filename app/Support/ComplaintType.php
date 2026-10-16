<?php

namespace App\Support;

/**
 * نوع نارضایتی.
 *
 * هر نوع فیلدهای مخصوص خودش را دارد، پس اعتبارسنجی و نمایش بر اساس
 * همین enum انجام می‌شود تا فرم و پنل هر سه نوع را یکسان ببینند.
 */
enum ComplaintType: string
{
    case Support = 'support';
    case Mentor = 'mentor';
    case Course = 'course';

    public function label(): string
    {
        return match ($this) {
            self::Support => 'پشتیبانی',
            self::Mentor => 'منتور',
            self::Course => 'دوره',
        };
    }

    /**
     * آیا این نوع نام منتور می‌خواهد؟
     *
     * نام منتور دو بخش دارد (نام و نام خانوادگی) و آزاد است؛ چون منتورها
     * رکورد حساب ندارند، عمداً به جدول `mentors` وصل نمی‌شود.
     */
    public function needsMentorName(): bool
    {
        return $this === self::Mentor;
    }

    /** آیا این نوع نام دوره می‌خواهد؟ */
    public function needsCourseName(): bool
    {
        return $this === self::Course;
    }
}
