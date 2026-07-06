<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * stores テーブルに deleted_at カラムを追加
     * ソフトデリート機能を有効化
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->softDeletes()->comment('削除日時（ソフトデリート）');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
