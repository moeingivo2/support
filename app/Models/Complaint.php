<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'mentor_id',
        'support_id',
        'shift_id',
        'description',
        'priority',
        'status',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function mentor()
    {
        return $this->belongsTo(Mentor::class);
    }

    public function support()
    {
        return $this->belongsTo(User::class, 'support_id');
    }

    public function shift()
    {
        return $this->belongsTo(Shift::class);
    }
}