<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'student_code', 'phone'];

    public function complaints()
    {
        return $this->hasMany(Complaint::class);
    }
}
