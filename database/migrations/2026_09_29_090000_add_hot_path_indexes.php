<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ایندکس‌های مسیر داغ.
 *
 * این ستون‌ها در کوئری‌های پرتکرار فیلتر یا مرتب‌سازی می‌شوند ولی
 * ایندکس نداشتند؛ در نتیجه هر درخواست صندوق ورودی یک اسکن کامل
 * جدول conversations می‌زد. Postgres روی کلید خارجی به‌صورت خودکار
 * ایندکس نمی‌سازد، بنابراین conversations.student_id هم بدون ایندکس بود.
 */
return new class extends Migration
{
    public function up(): void
    {
        // فهرست گفتگوهای یک دانشجو، مرتب بر آخرین پیام
        Schema::table('conversations', function (Blueprint $table) {
            $table->index(['student_id', 'last_message_at'], 'conv_student_last_msg_idx');
            $table->index(['unread_support_count', 'last_message_at'], 'conv_unread_last_msg_idx');
        });

        // فیلتر نقش در جدول کاربران (جدول نقش و رتبه‌بندی)
        Schema::table('users', function (Blueprint $table) {
            $table->index('role', 'users_role_idx');
        });

        // مرتب‌سازی امتیازهای یک پشتیبان بر اساس زمان
        Schema::table('message_ratings', function (Blueprint $table) {
            $table->index(['support_agent_id', 'submitted_at'], 'ratings_agent_submitted_idx');
        });

        // شیفت‌های پایان‌یافته بدون گزارش
        Schema::table('shifts', function (Blueprint $table) {
            $table->index(['status', 'end_time'], 'shifts_status_end_idx');
        });
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            $table->dropIndex('shifts_status_end_idx');
        });

        Schema::table('message_ratings', function (Blueprint $table) {
            $table->dropIndex('ratings_agent_submitted_idx');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_role_idx');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex('conv_unread_last_msg_idx');
            $table->dropIndex('conv_student_last_msg_idx');
        });
    }
};
