<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'support_id',
        'title',
        'last_message_preview',
        'last_message_at',
        'unread_student_count',
        'unread_support_count',
        'student_last_read_at',
        'support_last_read_at',
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
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function support(): BelongsTo
    {
        return $this->belongsTo(User::class, 'support_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
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
