<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * customersテーブルのline_user_idをnullableに変更
     * 管理画面から手動で顧客を作成する場合、LINE連携は必須ではないため
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // LINE関連フィールドをnullableに変更
            $table->string('line_user_id', 100)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // 元に戻す（NOT NULLに）
            $table->string('line_user_id', 100)->nullable(false)->change();
        });
    }
};
