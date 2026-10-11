<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('shift_reports', 'desk_requests_count')) {
            return;
        }

        Schema::table('shift_reports', function (Blueprint $table) {
            $table->dropColumn('desk_requests_count');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('shift_reports', 'desk_requests_count')) {
            return;
        }

        Schema::table('shift_reports', function (Blueprint $table) {
            $table->integer('desk_requests_count')->default(0)->after('unsatisfied_students_count');
        });
    }
};
