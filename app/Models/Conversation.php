<?php

namespace App\Models;

use App\Support\ActorRole;
use App\Support\ConversationStatus;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'support_id',
        'title',
        'student_sequence',
        'last_message_preview',
        'last_message_at',
        'unread_student_count',
        'unread_support_count',
        'student_last_read_at',
        'support_last_read_at',
        'status',
        'closure_actor',
        'closed_by',
        'closure_reason',
        'closed_at',
    ];

    protected $attributes = [
        'status' => ConversationStatus::Open->value,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'student_last_read_at' => 'datetime',
            'support_last_read_at' => 'datetime',
            'closed_at' => 'datetime',
            'status' => ConversationStatus::class,
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * مرتب‌سازی فهرست گفتگوها: جدیدترین بالا.
     *
     * «جدیدترین» یعنی زمان آخرین پیام، و اگر گفتگو هنوز پیامی ندارد، زمان
     * ساخت خودِ گفتگو. بدون این COALESCE، PostgreSQL در ‎ORDER BY … DESC‎
     * مقدار NULL را اول می‌آورد (NULLS FIRST پیش‌فرضش است) و همه‌ی
     * گفتگوهای خالی بالای فهرست می‌افتند؛ در حالی که ‎id‎ بزرگ‌تر یعنی
     * گفتگوی جدیدتر.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeNewestFirst(Builder $query): Builder
    {
        return $query
            ->orderByRaw('COALESCE(last_message_at, created_at) DESC')
            ->orderByDesc('id');
    }

    public function support(): BelongsTo
    {
        return $this->belongsTo(User::class, 'support_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * آخرین پیام گفتگو.
     *
     * برای تصمیمِ «آیا دانشجو جواب داده؟» لازم است؛ چون `last_message_at`
     * فقط یک زمان است و نمی‌گوید گوینده‌اش چه کسی بوده.
     */
    public function lastMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany('id');
    }

    public function rating(): HasOne
    {
        return $this->hasOne(MessageRating::class);
    }

    /**
     * گفتگوهای بازی که از این لحظه به بعد هیچ پیامی نگرفته‌اند.
     *
     * ملاک، زمان آخرین پیام است و اگر گفتگو هنوز پیامی ندارد، زمان ساختِ
     * خودش — دقیقاً همان چیزی که در فهرست‌ها «آخرین فعالیت» نشان داده
     * می‌شود.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeIdleSince(Builder $query, CarbonInterface $threshold): Builder
    {
        return $query
            ->where(function (Builder $inner) use ($threshold): void {
                $inner->where('last_message_at', '<=', $threshold)
                    ->orWhere(function (Builder $empty) use ($threshold): void {
                        $empty->whereNull('last_message_at')
                            ->where('created_at', '<=', $threshold);
                    });
            });
    }

    /**
     * آیا دانشجو آخرین حرف را زده است؟
     *
     * اگر گفتگو هنوز هیچ پیامی نداشته باشد، `false` است ولی این به معنی
     * «دانشجو جواب نداده» نیست؛ گفتگوی خالی را نباید خودکار بست.
     */
    public function awaitingStudentReply(): bool
    {
        $last = $this->lastMessage;

        return $last !== null && $last->actor_role !== ActorRole::Student;
    }

    public function isOpen(): bool
    {
        return $this->status === ConversationStatus::Open;
    }

    public function isClosed(): bool
    {
        return $this->status->isTerminal();
    }

    public function hasUnreadForSupport(): bool
    {
        return $this->unread_support_count > 0;
    }

    public function hasUnreadForStudent(): bool
    {
        return $this->unread_student_count > 0;
    }
}
