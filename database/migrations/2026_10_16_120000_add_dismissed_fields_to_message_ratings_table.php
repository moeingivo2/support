<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * کنار گذاشتنِ نارضایتیِ بی‌ربط (اسپم) روی امتیاز دانشجو.
 *
 * هر امتیازِ ۲ و کمتر به‌عنوان «دانشجوی ناراضی» در گزارش شیفت و ستون
 * «دانشجویان ناراضی» اکسل فعالیت شمرده می‌شود. بعضی از این امتیازها ربطی
 * به عملکرد پشتیبان ندارند، پس ناظر اکانت و سوپر ادمین باید بتوانند آن‌ها
 * را کنار بگذارند.
 *
 * حذفِ واقعی نمی‌شود: رکورد امتیاز برای سابقه‌ی گفتگو می‌ماند و فقط از
 * شمارشِ نارضایتی کنار می‌رود، ضمن اینکه با «بازگرداندن» قابل احیاست.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('message_ratings', function (Blueprint $table): void {
            $table->timestamp('dismissed_at')->nullable()->after('description');
            $table->foreignId('dismissed_by')
                ->nullable()
                ->after('dismissed_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('message_ratings', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('dismissed_by');
            $table->dropColumn(['dismissed_at']);
        });
    }
};
