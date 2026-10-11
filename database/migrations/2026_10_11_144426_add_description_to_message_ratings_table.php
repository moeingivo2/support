<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('message_ratings', function (Blueprint $table) {
            $table->text('description')->nullable()->after('rating_value');
        });
    }

    public function down(): void
    {
        Schema::table('message_ratings', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
