<?php

namespace App\Support;

use App\Models\StudentProfile;

/**
 * ساختار یکسان پاسخ پروفایل دانشجو برای صفحه حساب و پنل پشتیبانی.
 */
class StudentProfilePayload
{
    /**
     * @return array<string, mixed>
     */
    public static function make(StudentProfile $profile): array
    {
        $profile->loadMissing(['user', 'mentor']);

        return [
            'user_id' => $profile->user_id,
            'full_name' => trim($profile->user?->name ?? ''),
            // دانشجویان با شماره موبایل ثبت‌نام می‌کنند و ایمیل ندارند
            'phone' => $profile->user?->phone,
            'phone_display' => $profile->user?->phone !== null
                ? IranianPhone::display($profile->user->phone)
                : null,
            'email' => $profile->user?->email,
            'course' => $profile->course->value,
            'course_label' => $profile->course->label(),
            'track' => $profile->track?->value,
            'track_label' => $profile->track?->label(),
            'purchased_sessions' => $profile->sortedSessions(),
            'total_sessions' => config('aiosupport.sessions_per_track'),
            'total_chats' => $profile->total_chats,
            'used_chats' => $profile->used_chats,
            'remaining_chats' => $profile->remainingChats(),
            'remaining_percentage' => $profile->remainingPercentage(),
            'is_low_on_chats' => $profile->remainingChats() <= config('aiosupport.low_remaining_threshold'),
            'low_remaining_threshold' => config('aiosupport.low_remaining_threshold'),
            'mentor_name' => $profile->mentor?->name,
            'membership_date' => $profile->membership_date?->toIso8601String(),
        ];
    }
}
