<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
// app/Models/User.php
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'support_type',
        'observer_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    // Helper methods
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSupport(): bool
    {
        return $this->role === 'support';
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }

    /**
     * ناظر فقط‌خواندنی برای حسابرسی عملیاتی.
     */
    public function isObserver(): bool
    {
        return $this->role === 'observer';
    }

    /**
     * ناظر اکانت — علاوه بر نظارت، تیم پشتیبان خودش را مدیریت می‌کند.
     * با ناظر فقط‌خواندنی یکی نیست و دسترسی‌های بیشتری دارد.
     */
    public function isAccountObserver(): bool
    {
        return $this->role === 'account_observer';
    }

    /**
     * دسترسی به متن گفتگو — سوپر ادمین طبق سیاست ندارد.
     */
    public function canReadTranscripts(): bool
    {
        return in_array($this->role, ['support', 'observer', 'account_observer'], true);
    }

    public function shifts()
    {
        return $this->hasMany(Shift::class);
    }

    public function observer(): BelongsTo
    {
        return $this->belongsTo(self::class, 'observer_id');
    }

    // پروفایل آموزشی دانشجو (دوره، رشته، جلسات و سهمیه چت)
    public function profile()
    {
        return $this->hasOne(StudentProfile::class);
    }

    // گفتگوهایی که دانشجو شروع کرده است
    public function conversations()
    {
        return $this->hasMany(Conversation::class, 'student_id');
    }

    // گفتگوهایی که به این پشتیبان تخصیص یافته است
    public function assignedConversations()
    {
        return $this->hasMany(Conversation::class, 'support_id');
    }

    public function ratings()
    {
        return $this->hasMany(MessageRating::class, 'support_agent_id');
    }

    // یک متد کمکی برای گرفتن شیفت فعال کاربر
    public function activeShift()
    {
        return $this->hasOne(Shift::class)->where('status', 'active');
    }

    public function complaints()
    {
        return $this->hasMany(Complaint::class, 'support_id');
    }

    public function resources()
    {
        return $this->hasMany(Resource::class, 'created_by');
    }

    public function shiftReports()
    {
        return $this->hasMany(ShiftReport::class);
    }
}
