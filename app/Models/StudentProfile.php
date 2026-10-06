<?php

namespace App\Models;

use App\Support\CourseTrack;
use App\Support\CourseType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course',
        'track',
        'purchased_sessions',
        'total_chats',
        'used_chats',
        'mentor_id',
        'membership_date',
        'roadmap_path',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'course' => CourseType::class,
            'track' => CourseTrack::class,
            'purchased_sessions' => 'array',
            'membership_date' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function mentor(): BelongsTo
    {
        return $this->belongsTo(Mentor::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'student_id', 'user_id');
    }

    public function remainingChats(): int
    {
        return max(0, $this->total_chats - $this->used_chats);
    }

    public function remainingPercentage(): int
    {
        if ($this->total_chats <= 0) {
            return 0;
        }

        return (int) floor($this->remainingChats() / $this->total_chats * 100);
    }

    /**
     * @return array<int, int>
     */
    public function sortedSessions(): array
    {
        $sessions = $this->purchased_sessions ?? [];

        sort($sessions);

        return array_values($sessions);
    }
}
