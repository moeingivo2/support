<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table): void {
            $table->unsignedInteger('student_sequence')->nullable()->after('student_id');
        });

        // شماره‌ی هر گفتگو در بازه‌ی دانشجو خودش است، پس یکتایی فقط
        // روی (دانشجو، شماره) معنا دارد.
        Schema::table('conversations', function (Blueprint $table): void {
            $table->unique(['student_id', 'student_sequence'], 'conversations_student_sequence_unique');
        });

        $this->backfill();
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table): void {
            $table->dropUnique('conversations_student_sequence_unique');
            $table->dropColumn('student_sequence');
        });
    }

    /**
     * به هر دانشجو شماره‌ی ترتیبی بر اساس ترتیب ساخت گفتگوها می‌دهد.
     *
     * در ویندوز row_number همراه PARTITION BY روی نسخه‌های قدیمی‌تر
     * مشکل‌ساز بود، پس شماره در PHP و با یک کوئری به‌روزرسانی می‌شود.
     */
    private function backfill(): void
    {
        $conversations = DB::table('conversations')
            ->select('id', 'student_id')
            ->orderBy('id')
            ->get();

        $perStudent = [];

        foreach ($conversations as $conversation) {
            $studentId = (int) $conversation->student_id;
            $perStudent[$studentId] = ($perStudent[$studentId] ?? 0) + 1;

            DB::table('conversations')
                ->where('id', $conversation->id)
                ->update(['student_sequence' => $perStudent[$studentId]]);
        }
    }
};
