<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ایندکس‌های پرس‌وشوهای پرتکرار داشبورد و لیست‌ها — برای تحمل بار همزمان بالا
        Schema::table('shifts', function (Blueprint $table) {
            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });

        Schema::table('complaints', function (Blueprint $table) {
            $table->index(['status', 'created_at']);
            $table->index(['support_id', 'created_at']);
        });

        Schema::table('shift_reports', function (Blueprint $table) {
            $table->index(['user_id', 'created_at']);
            $table->index('created_at');
        });

        Schema::table('resources', function (Blueprint $table) {
            $table->index(['type', 'created_at']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropIndex(['status', 'created_at']);
        });

        Schema::table('complaints', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['support_id', 'created_at']);
        });

        Schema::table('shift_reports', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('resources', function (Blueprint $table) {
            $table->dropIndex(['type', 'created_at']);
            $table->dropIndex(['category']);
        });
    }
};
