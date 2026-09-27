<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->enum('course', ['offline', 'in_person', 'school']);
            $table->enum('track', ['ai', 'web'])->nullable();
            $table->json('purchased_sessions')->nullable();
            $table->unsignedInteger('total_chats')->default(0);
            $table->unsignedInteger('used_chats')->default(0);
            $table->foreignId('mentor_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('membership_date')->nullable();
            $table->timestamps();

            $table->index(['course', 'track']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_profiles');
    }
};
