<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'channel',
        'start_time',
        'end_time',
        'status',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    // رابطه با کاربر (پشتیبان)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // رابطه با گزارش پایان شیفت (بعداً می‌سازیم)ط
    public function report()
    {
        return $this->hasOne(ShiftReport::class);
    }

    // محاسبه مدت زمان شیفت به دقیقه
    public function getDurationInMinutesAttribute()
    {
        $end = $this->end_time ?? now();
        return $this->start_time->diffInMinutes($end);
    }
}