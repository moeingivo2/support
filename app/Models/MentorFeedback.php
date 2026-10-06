<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MentorFeedback extends Model
{
    protected $table = 'mentor_feedback';

    protected $fillable = ['student_user_id', 'mentor_name', 'description', 'status'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_user_id');
    }
}
