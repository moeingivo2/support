<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('message_ratings', function (Blueprint $table) {
            // شیفتی که پشتیبان واقعاً در آن به این دانشجو پاسخ داده بود، نه
            // شیفتی که در لحظه‌ی ثبت امتیاز فعال بوده. دانشجو ممکن است روز
            // بعد گفتگو را ببندد و امتیاز بدهد، و آن‌وقت شیفتِ درست خیلی
            // وقت پیش‌تر تمام شده است.
            $table->foreignId('shift_id')
                ->nullable()
                ->after('support_agent_id')
                ->constrained('shifts')
                ->nullOnDelete();
        });

        // گزارش شیفت با همین ستون فیلتر می‌کند.
        Schema::table('message_ratings', function (Blueprint $table) {
            $table->index(['shift_id', 'rating_value']);
        });
    }

    public function down(): void
    {
        Schema::table('message_ratings', function (Blueprint $table) {
            $table->dropForeign(['shift_id']);
            $table->dropColumn('shift_id');
        });
    }
};
