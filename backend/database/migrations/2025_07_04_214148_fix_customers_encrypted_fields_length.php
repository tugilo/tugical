<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 顧客テーブルの暗号化フィールド長さ修正
     * phone, email, address フィールドを暗号化データに対応
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // 暗号化されたデータは通常300-500文字程度必要
            $table->string('phone', 500)->nullable()->change()->comment('電話番号（暗号化）');
            $table->string('email', 500)->nullable()->change()->comment('メールアドレス（暗号化）');
            $table->text('address')->nullable()->change()->comment('住所（暗号化）');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // 元の長さに戻す
            $table->string('phone', 20)->nullable()->change()->comment('電話番号');
            $table->string('email', 255)->nullable()->change()->comment('メールアドレス');
            $table->text('address')->nullable()->change()->comment('住所');
        });
    }
};
