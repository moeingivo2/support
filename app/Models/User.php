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

#[Fillable(['name', 'phone', 'password'])]
#[Hidden(['password', 'remember_token'])]
// app/Models/User.php
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
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
     * کارآموز — پشتیبانی که فقط گفتگوها را می‌بیند تا یاد بگیرد؛
     * مانند ناظر فقط‌خواندنی رفتار می‌کند اما هیچ ابزار دیگری ندارد.
     */
    public function isTrainee(): bool
    {
        return $this->role === 'trainee';
    }

    /**
     * پنل‌نشینِ فقط‌مشاهده: ناظر یا کارآموز. پاسخ‌گویی و تغییر وضعیت ندارد.
     */
    public function isReadOnlyViewer(): bool
    {
        return $this->isObserver() || $this->isTrainee();
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
        return in_array($this->role, ['support', 'observer', 'account_observer', 'trainee'], true);
    }

    /**
     * کانالی که این کاربر فقط به آن محدود است، یا `null` اگر محدود نیست.
     *
     * ناظرِ اکانت خودش یک پشتیبان با `support_type` مشخص است و تیمِ همان
     * کانال را می‌بیند؛ پس نباید بتواند کانالِ دیگر (مثلاً هوش مصنوعی برای
     * ناظرِ وب) را از راه پارامترِ `channel` یا فیلتر دستی رد کند.
     *
     * سوپر ادمین و ناظرِ فقط‌خواندنی محدود نیستند و `null` می‌گیرند.
     *
     * @return string|null `web` یا `ai`، و `null` برای نقش‌های بدون محدودیت
     */
    public function restrictedChannel(): ?string
    {
        return $this->isAccountObserver() ? $this->support_type : null;
    }

    /**
     * کانالِ مؤثر برای فیلتر کردن داده‌ها.
     *
     * برای نقش‌های محدود، هر مقدارِ درخواستی نادیده گرفته می‌شود و کانال
     * خودشان اعمال می‌شود؛ برای بقیه، مقدارِ خواسته‌شده اگر معتبر باشد.
     */
    public function effectiveChannel(?string $requested = null): ?string
    {
        $restricted = $this->restrictedChannel();

        if ($restricted !== null) {
            return $restricted;
        }

        return in_array($requested, ['web', 'ai'], true) ? $requested : null;
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

    /** نارضایتی‌هایی که این کاربر به‌عنوان دانشجو ثبت کرده است. */
    public function complaints()
    {
        return $this->hasMany(Complaint::class, 'user_id');
    }

    /** نارضایتی‌های نوع «پشتیبانی» که بابت این پشتیبان ثبت شده‌اند. */
    public function supportComplaints()
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
