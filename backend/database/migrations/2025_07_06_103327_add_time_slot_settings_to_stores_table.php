<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 時間スロット設定を stores テーブルに追加
     * 5分〜60分の柔軟な時間間隔設定を可能にする
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->json('time_slot_settings')
                ->nullable()
                ->after('notification_settings')
                ->comment('時間スロット設定 (JSON: slot_duration_minutes, business_hours, etc.)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('time_slot_settings');
        });
    }
};
