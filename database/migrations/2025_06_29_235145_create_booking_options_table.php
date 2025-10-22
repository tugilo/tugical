<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 予約オプションテーブル作成
     * 各予約に追加されたオプションサービスの詳細記録
     */
    public function up(): void
    {
        Schema::create('booking_options', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('booking_id')->constrained('bookings')->onDelete('cascade')->comment('予約ID（FK）');
            $table->foreignId('menu_option_id')->constrained('menu_options')->onDelete('cascade')->comment('メニューオプションID（FK）');
            
            // 予約時点の詳細（スナップショット）
            $table->string('option_name')->comment('オプション名（予約時点）');
            $table->text('option_description')->nullable()->comment('オプション説明（予約時点）');
            $table->integer('unit_price')->comment('単価（予約時点）');
            $table->integer('duration')->default(0)->comment('追加時間（分）（予約時点）');
            
            // 数量・料金計算
            $table->integer('quantity')->default(1)->comment('数量');
            $table->integer('total_price')->comment('合計料金（単価×数量）');
            
            // オプション種別・詳細
            $table->enum('option_type', ['addon', 'upgrade', 'material', 'service'])
                ->comment('オプション種別');
            $table->json('option_details')->nullable()->comment('オプション詳細情報');
            
            // メモ・備考
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['booking_id'], 'idx_booking_options_booking');
            $table->index(['menu_option_id'], 'idx_booking_options_menu_option');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_options');
    }
}; 