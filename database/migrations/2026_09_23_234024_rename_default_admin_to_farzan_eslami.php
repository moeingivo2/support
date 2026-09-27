<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('email', 'admin@example.com')
            ->where('role', 'admin')
            ->update(['name' => 'فرزان اسلامی']);
    }

    public function down(): void
    {
        DB::table('users')
            ->where('email', 'admin@example.com')
            ->where('role', 'admin')
            ->update(['name' => 'محمدحسین میری‌پور']);
    }
};
