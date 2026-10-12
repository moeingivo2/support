<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * درخواست ارتقا چندگزینه شد: کاربر همزمان چند دوره را انتخاب می‌کند و برای
 * هر کدام، رشته و «دوره‌ی شرکت‌کرده» ثبت می‌شود. ستون‌های تک‌دوره‌ی قبلی
 * کنار گذاشته می‌شوند و انتخاب‌ها داخل `courses` (JSON) می‌آیند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_upgrade_requests', function (Blueprint $table): void {
            $table->json('courses')->nullable()->after('student_id');
        });

        Schema::table('student_upgrade_requests', function (Blueprint $table): void {
            $table->dropColumn(['course', 'track', 'purchased_sessions']);
        });
    }

    public function down(): void
    {
        Schema::table('student_upgrade_requests', function (Blueprint $table): void {
            $table->enum('course', ['offline', 'in_person', 'school']);
            $table->enum('track', ['ai', 'web'])->nullable();
            $table->json('purchased_sessions')->nullable();
        });

        Schema::table('student_upgrade_requests', function (Blueprint $table): void {
            $table->dropColumn('courses');
        });
    }
};
