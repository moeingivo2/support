<?php

namespace App\Models;

use App\Support\ComplaintStatus;
use App\Support\ComplaintType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * یک نارضایتی که دانشجو خودش ثبت کرده است.
 *
 * بسته به `type` فقط بخشی از ستون‌های اختیاری پر می‌شوند؛
 * {@see ComplaintType::needsMentorName()} و {@see ComplaintType::needsCourseName()}
 * همین را تعیین می‌کنند.
 */
class Complaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'mentor_first_name',
        'mentor_last_name',
        'course_name',
        'description',
        'status',
        'conversation_id',
        'support_id',
        'seen_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ComplaintType::class,
            'status' => ComplaintStatus::class,
            'seen_at' => 'datetime',
        ];
    }

    /** ثبت‌کننده (دانشجو) */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * پشتیبانی که نارضایتی «پشتیبانی» بابت او ثبت شده.
     *
     * فقط برای نوع `support` پر است و از روی همان گفتگو تعیین می‌شود.
     */
    public function support(): BelongsTo
    {
        return $this->belongsTo(User::class, 'support_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /** نام کامل منتور، برای نمایش در پنل. */
    public function mentorFullName(): string
    {
        return trim(implode(' ', array_filter([
            $this->mentor_first_name,
            $this->mentor_last_name,
        ])));
    }

    /** آیا هنوز خوانده نشده و باید در نشان قرمز بیاید؟ */
    public function isUnseen(): bool
    {
        return $this->seen_at === null;
    }
}
