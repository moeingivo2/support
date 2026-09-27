<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * نقش «student» به جدول users اضافه می‌شود.
     *
     * روی SQLite نوع enum به‌صورت varchar بدون قید ذخیره می‌شود، اما روی
     * Postgres و MySQL قید سخت‌گیرانه می‌سازد؛ بنابراین باید صریحاً اصلاح شود.
     */
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $this->rewritePostgresCheckConstraint("'admin', 'support', 'student'");

            return;
        }

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE users MODIFY role VARCHAR(255) NOT NULL DEFAULT 'support'");
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $this->rewritePostgresCheckConstraint("'admin', 'support'");

            return;
        }

        if ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin','support') NOT NULL DEFAULT 'support'");
        }
    }

    private function rewritePostgresCheckConstraint(string $roles): void
    {
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ({$roles}))");
    }
};
