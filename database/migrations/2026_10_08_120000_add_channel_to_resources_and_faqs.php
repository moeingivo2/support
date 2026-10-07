<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * سورس جلسات، فایل‌های مورد نیاز و سوالات متداول به دو بخشِ مستقلِ «وب» و
 * «هوش مصنوعی» تقسیم می‌شوند؛ هر پشتیبان و هر ناظر اکانت فقط بخش هم‌نوع
 * خودش را می‌بیند و هر دانشجو سورس‌های همان مسیری را که در آن ثبت‌نام
 * کرده دریافت می‌کند. رکوردهای موجود در بخش وب قرار می‌گیرند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resources', function (Blueprint $table): void {
            $table->enum('channel', ['web', 'ai'])->default('web')->after('type');
            $table->index(['type', 'channel']);
        });

        Schema::table('faqs', function (Blueprint $table): void {
            $table->enum('channel', ['web', 'ai'])->default('web')->after('category');
            $table->index(['channel', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('resources', function (Blueprint $table): void {
            $table->dropIndex(['type', 'channel']);
            $table->dropColumn('channel');
        });

        Schema::table('faqs', function (Blueprint $table): void {
            $table->dropIndex(['channel', 'is_active']);
            $table->dropColumn('channel');
        });
    }
};
