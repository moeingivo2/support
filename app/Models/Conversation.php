<?php

namespace App\Models;

use App\Support\ConversationStatus;
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

    public function rating(): HasOne
    {
        return $this->hasOne(MessageRating::class);
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
