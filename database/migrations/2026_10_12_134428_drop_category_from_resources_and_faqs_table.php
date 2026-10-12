<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * دسته‌بندی (category) از منابع جلسات، فایل‌ها و سوالات حذف می‌شود؛
 * دسته‌بندی فقط برای ویدیوهای آموزشی می‌ماند.
 */
return new class extends Migration
{
    public function up(): void
    {
        // SQLite اجازه‌ی حذف ستونی که در ایندکس شرکت دارد را نمی‌دهد؛
        // پس اول ایندکس `resources_category_index` را برمی‌داریم.
        Schema::table('resources', function (Blueprint $table): void {
            $table->dropIndex('resources_category_index');
        });

        Schema::table('resources', function (Blueprint $table): void {
            $table->dropColumn('category');
        });

        Schema::table('faqs', function (Blueprint $table): void {
            $table->dropColumn('category');
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table): void {
            $table->string('category')->nullable();
        });

        Schema::table('faqs', function (Blueprint $table): void {
            $table->string('category')->nullable();
        });

        Schema::table('resources', function (Blueprint $table): void {
            $table->index('category');
        });
    }
};
