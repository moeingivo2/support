<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * دانشجویان با شماره موبایل ثبت‌نام می‌کنند و ایمیل ندارند؛ بنابراین
 * درخواست بازیابی رمز عبور باید بر پایه‌ی شماره موبایل ثبت شود.
 * ستون email برای سازگاری با داده‌های قبلی حفظ می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('password_reset_requests', function (Blueprint $table) {
            $table->string('phone')->nullable()->index();
            // دانشجویان ایمیل ندارند، پس ستون قدیمی نباید اجباری باشد
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('password_reset_requests', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
    }
};
