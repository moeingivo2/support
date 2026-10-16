<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'student_code', 'phone'];

    /**
     * نارضایتی‌های ثبت‌شده توسط این دانشجو.
     *
     * رکورد دانشجو فقط آینه‌ای از حساب کاربری است، پس از همان `users.id`
     * می‌رود نه از کلید خودِ جدول `students`.
     */
    public function complaints()
    {
        return $this->hasMany(Complaint::class, 'user_id');
    }
}
