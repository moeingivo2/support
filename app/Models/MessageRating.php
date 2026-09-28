<?php

namespace App\Models;

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
        'rating_value',
        'closure_actor',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'rating_value' => 'integer',
            'submitted_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
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
