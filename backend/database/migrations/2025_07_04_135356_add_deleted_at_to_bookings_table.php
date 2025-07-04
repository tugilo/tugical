<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * bookingsテーブルにソフトデリート用のdeleted_atカラムを追加
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->softDeletes()->comment('削除日時（ソフトデリート）');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
