<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('support_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title')->default('گفتگوی جدید');
            $table->string('last_message_preview')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->unsignedInteger('unread_student_count')->default(0);
            $table->unsignedInteger('unread_support_count')->default(0);
            $table->timestamp('student_last_read_at')->nullable();
            $table->timestamp('support_last_read_at')->nullable();
            $table->timestamps();

            $table->index(['support_id', 'last_message_at']);
            $table->index('last_message_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
