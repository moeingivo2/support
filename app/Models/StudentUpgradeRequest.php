<?php

namespace App\Models;

use App\Support\CourseTrack;
use App\Support\CourseType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentUpgradeRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'course',
        'track',
        'purchased_sessions',
        'extra_chats',
        'status',
        'note',
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
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
