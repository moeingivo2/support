<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('shift_reports', 'calls_count')) {
            return;
        }

        Schema::table('shift_reports', function (Blueprint $table) {
            $table->dropColumn('calls_count');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('shift_reports', 'calls_count')) {
            return;
        }

        Schema::table('shift_reports', function (Blueprint $table) {
            $table->integer('calls_count')->default(0)->after('desk_requests_count');
        });
    }
};
