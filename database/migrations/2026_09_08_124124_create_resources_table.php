<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resources', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('type', ['session_source', 'required_file', 'other'])->default('session_source');
            $table->string('file_url'); // آدرس فایل یا لینک مستقیم
            $table->string('category')->nullable(); // مثلا: لاراول، پایتون، نرم‌افزار پایه
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resources');
    }
};