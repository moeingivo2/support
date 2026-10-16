<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * یک امتیاز برای هر گفتگوی واجد شرایط.
 * برای بستن توسط دانشجو، ثبت امتیاز پیش از بستن الزامی است.
 */
class MessageRating extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'student_id',
        'support_agent_id',
        'shift_id',
        'rating_value',
        'description',
        'closure_actor',
        'submitted_at',
        'dismissed_at',
        'dismissed_by',
    ];

    protected function casts(): array
    {
        return [
            'rating_value' => 'integer',
            'submitted_at' => 'datetime',
            'dismissed_at' => 'datetime',
        ];
    }

    /** ناظر اکانت یا سوپر ادمینی که این نارضایتی را بی‌ربط اعلام کرده. */
    public function dismisser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dismissed_by');
    }

    /**
     * آیا این نارضایتی بی‌ربط اعلام شده است؟
     *
     * چنین امتیازی در شمارشِ «دانشجویان ناراضی» نمی‌آید ولی رکوردش برای
     * سابقه‌ی گفتگو باقی می‌ماند.
     */
    public function isDismissed(): bool
    {
        return $this->dismissed_at !== null;
    }

    public function scopeDismissed(Builder $query): Builder
    {
        return $query->whereNotNull('dismissed_at');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('dismissed_at');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function supportAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'support_agent_id');
    }
}
