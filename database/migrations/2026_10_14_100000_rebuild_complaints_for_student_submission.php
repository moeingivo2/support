<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * بازسازی جدول نارضایتی‌ها برای ثبتِ یکپارچه توسط دانشجو.
 *
 * ساختار قبلی برای ثبتِ کارکنان طراحی شده بود: نام دانشجو، کد و تلفن او،
 * یک منتور انتخابی، اولویت و شیفت. با حذف فرم کارکنان، این ستون‌ها دیگر
 * معنا ندارند؛ دانشجو خودش ثبت می‌کند و فقط نوع و توضیح لازم است.
 *
 * داده‌های قبلی عمداً پاک می‌شوند: ساختارشان با مدل جدید سازگار نیست و
 * رکوردهای `mentor_feedback` هم به همین جدول منتقل می‌شوند.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('complaints');

        Schema::create('complaints', function (Blueprint $table): void {
            $table->id();

            // ثبت‌کننده: دانشجوی واردشده.
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // یکی از سه نوع نارضایتی.
            $table->enum('type', ['support', 'mentor', 'course'])->index();

            // فقط برای نوع «منتور» پر می‌شود.
            $table->string('mentor_first_name', 120)->nullable();
            $table->string('mentor_last_name', 120)->nullable();

            // فقط برای نوع «دوره» پر می‌شود.
            $table->string('course_name', 160)->nullable();

            $table->text('description');

            $table->enum('status', ['open', 'in_progress', 'resolved'])->default('open');

            // لینک اختیاری به گفتگویی که نارضایتی از آن ثبت شده. برای نوع
            // «پشتیبانی» از همین رابطه می‌فهمیم شکایت بابت کدام پشتیبان
            // بوده تا در فعالیت همان پشتیبان دیده شود.
            $table->foreignId('conversation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('support_id')->nullable()->constrained('users')->nullOnDelete();

            // «دیده شده» برای نشان قرمزِ شبیه تلگرام: تا وقتی null باشد در
            // شمارشِ خوانده‌نشده‌ها می‌آید.
            $table->timestamp('seen_at')->nullable();

            $table->timestamps();

            // فیلتر «نوع + بازه‌ی زمانی» و نشان قرمز، هر دو به این ترکیب
            // نیاز دارند.
            $table->index(['status', 'created_at']);
            $table->index(['type', 'created_at']);
        });

        Schema::dropIfExists('mentor_feedback');

        Schema::enableForeignKeyConstraints();
    }

    public function down(): void
    {
        // بازگردانی ساختار قبلی ممکن نیست: داده‌ها در up حذف شده‌اند.
        Schema::dropIfExists('complaints');
        Schema::create('complaints', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mentor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('support_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained()->nullOnDelete();
            $table->text('description');
            $table->enum('priority', ['high', 'normal', 'low'])->default('normal');
            $table->enum('status', ['open', 'in_progress', 'resolved'])->default('open');
            $table->timestamps();
        });
    }
};
