<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * نقش «کارآموز» (trainee): پشتیبانیِ فقط‌مشاهده که تنها متن گفتگوها را
 * می‌بیند تا یاد بگیرد؛ هیچ ابزار مدیریتی و پاسخ‌گویی ندارد.
 *
 * در SQLite ستون role از نوع varchar است و محدودیت check ندارد؛ فقط
 * Postgres به‌روزرسانی constraint نیاز دارد.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'support', 'observer', 'account_observer', 'student', 'trainee'))");
        }
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'support', 'observer', 'account_observer', 'student'))");
        }
    }
};
