<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // نقش «observer» برای حساب ناظر فقط‌خواندنی.
        // پیش از این مهاجرت، role روی MySQL به varchar تبدیل شده و روی SQLite
        // اصلاً قیدی ندارد؛ فقط Postgres به بازنویسی قید نیاز دارد.
        if (DB::connection()->getDriverName() === 'pgsql') {
            $this->rewritePostgresCheckConstraint("'admin', 'support', 'observer', 'student'");
        }

        // وضعیت چرخه‌ی حیات گفتگو
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('status')->default('open')->index();
            $table->string('closure_actor')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('closure_reason')->nullable();
            $table->timestamp('closed_at')->nullable();
        });

        // انتساب بازیگر پیام برای حسابرسی
        Schema::table('messages', function (Blueprint $table) {
            $table->string('actor_role')->default('student');
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_edited')->default(false);
        });

        // امتیازدهی — یک رکورد به ازای هر گفتگوی واجد شرایط
        Schema::create('message_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            // اگر دانشجو پیش از پاسخ هر پشتیبانی گفتگو را ببندد، پشتیبانی وجود ندارد
            $table->foreignId('support_agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('rating_value');
            $table->string('closure_actor')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->index(['support_agent_id', 'rating_value']);
        });

        // ثبت دسترسی ناظر برای انطباق
        Schema::create('observer_access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('observer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('action')->default('view_transcript');
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['observer_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observer_access_logs');
        Schema::dropIfExists('message_ratings');

        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['actor_role', 'actor_id', 'is_edited']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['status', 'closure_actor', 'closed_by', 'closure_reason', 'closed_at']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            $this->rewritePostgresCheckConstraint("'admin', 'support', 'student'");
        }
    }

    private function rewritePostgresCheckConstraint(string $roles): void
    {
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ({$roles}))");
    }
};
