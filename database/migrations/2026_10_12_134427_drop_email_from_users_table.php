<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ایمیل به‌طور کامل حذف می‌شود؛ احراز هویت فقط با شماره موبایل است.
 */
return new class extends Migration
{
    public function up(): void
    {
        // SQLite نمی‌تواند ستونی را که در یک ایندکس یکتا شرکت دارد حذف کند؛
        // پس اول ایندکس/constraint یکتا را برمی‌داریم. در Postgres هم حذف
        // ستون constraint یکتا را خودکار پاک نمی‌کند، پس این گام لازم است.
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_email_unique');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['email', 'email_verified_at']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('email')->nullable();
            $table->timestamp('email_verified_at')->nullable();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->unique('email');
        });
    }
};
