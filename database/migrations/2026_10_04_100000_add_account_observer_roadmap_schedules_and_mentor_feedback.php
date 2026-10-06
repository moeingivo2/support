<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'support', 'observer', 'account_observer', 'student'))");
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('observer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->index(['observer_id', 'role']);
        });

        Schema::table('student_profiles', function (Blueprint $table): void {
            $table->string('roadmap_path')->nullable();
        });

        Schema::create('shift_schedules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('channel', 10);
            $table->date('shift_date');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->timestamps();
            $table->index(['channel', 'shift_date']);
        });

        Schema::create('shift_schedule_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('shift_schedule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->time('starts_at');
            $table->time('ends_at');
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();
            $table->unique(['shift_schedule_id', 'user_id']);
            $table->index(['user_id', 'starts_at']);
        });

        Schema::create('mentor_feedback', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('student_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('mentor_name', 255);
            $table->text('description');
            $table->string('status', 20)->default('open');
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mentor_feedback');
        Schema::dropIfExists('shift_schedule_assignments');
        Schema::dropIfExists('shift_schedules');
        Schema::table('student_profiles', function (Blueprint $table): void {
            $table->dropColumn('roadmap_path');
        });
        Schema::table('users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('observer_id');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'support', 'observer', 'student'))");
        }
    }
};
