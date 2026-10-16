<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mentor extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'phone'];

    /**
     * منتورها رکورد حساب ندارند و نارضایتیِ منتور با نام آزاد ثبت می‌شود،
     * پس رابطه‌ای وجود ندارد. این متد عمداً حذف شد.
     */
}
