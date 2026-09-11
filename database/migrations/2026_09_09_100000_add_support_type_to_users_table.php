<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // نوع پشتیبانی که کاربر پشتیبان به آن تعلق دارد؛ ادمین null است
        Schema::table('users', function (Blueprint $table) {
            $table->enum('support_type', ['web', 'ai'])->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('support_type');
        });
    }
};
