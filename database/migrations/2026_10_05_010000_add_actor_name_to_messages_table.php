<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('messages', 'actor_name')) {
            return;
        }

        Schema::table('messages', function (Blueprint $table): void {
            $table->string('actor_name')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('messages', 'actor_name')) {
            return;
        }

        Schema::table('messages', function (Blueprint $table): void {
            $table->dropColumn('actor_name');
        });
    }
};
