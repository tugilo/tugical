<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * customers テーブルに deleted_at カラムを追加
     * ソフトデリート機能を有効化
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->softDeletes()->comment('削除日時（ソフトデリート）');
            
            // ソフトデリート用のインデックス追加
            $table->index(['store_id', 'deleted_at'], 'idx_customers_soft_delete');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // インデックスを先に削除
            $table->dropIndex('idx_customers_soft_delete');
            
            // deleted_at カラムを削除
            $table->dropSoftDeletes();
        });
    }
};
