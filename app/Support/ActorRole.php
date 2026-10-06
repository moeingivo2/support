<?php

namespace App\Support;

/**
 * نقش ثبت‌شده روی هر پیام برای حسابرسی.
 * این فیلد پس از ثبت پیام تغییر نمی‌کند.
 */
enum ActorRole: string
{
    case Student = 'student';
    case Support = 'support';
    case Observer = 'observer';
    case System = 'system';

    public function label(): string
    {
        return match ($this) {
            self::Student => 'دانشجو',
            self::Support => 'پشتیبان',
            self::Observer => 'ناظر',
            self::System => 'سامانه',
        };
    }

    public static function forRole(string $role): self
    {
        return match ($role) {
            'student' => self::Student,
            'support', 'account_observer' => self::Support,
            'observer' => self::Observer,
            default => self::System,
        };
    }
}
