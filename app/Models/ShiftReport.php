<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShiftReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'shift_id',
        'user_id',
        'responded_students_count',
        'unsatisfied_students_count',
        'desk_requests_count',
        'extra_notes',
    ];

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}