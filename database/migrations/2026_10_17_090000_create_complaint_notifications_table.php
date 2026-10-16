<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * اعلان‌های دانشجو.
 *
 * فعلاً تنها منبعش تغییر وضعیت نارضایتی در پنل سوپر ادمین است: دانشجو باید
 * بفهمد وضعیت نارضایتی‌اش عوض شده، حتی اگر آن لحظه داخل گفتگو نبوده.
 *
 * جدول عمداً کوچک و صریح است (به‌جای استفاده از نوتیفیکیشن عمومیِ لاراول)
 * چون فقط مخاطبش دانجوست و فقط یک نوع اعلان دارد؛ اگر روزی اعلان‌های
 * دیگری اضافه شد، همین جدول با چند `type` جدید کامل می‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_notifications', function (Blueprint $table): void {
            $table->id();

            // دانشجویی که اعلان برای اوست.
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // نارضایتیِ مرتبط؛ اگر نارضایتی حذف شود اعلان هم می‌رود.
            $table->foreignId('complaint_id')->constrained()->cascadeOnDelete();

            // عنوان و متن آماده‌ی نمایش، تا رندر سمت کاربر لازم نباشد تاریخچه
            // را بازسازی کند (که با تغییر وضعیت‌های بعدی خراب می‌شد).
            $table->string('title');
            $table->text('body');

            // وضعیتی که به دانشجو اعلام شد، برای نمایش رنگی.
            $table->string('status');

            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_notifications');
    }
};
