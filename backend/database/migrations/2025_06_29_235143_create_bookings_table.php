<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 予約テーブル作成
     * 予約システムの中核テーブル：予約 = リソース × 時間枠 × メニュー
     */
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade')->comment('顧客ID（FK）');
            $table->foreignId('resource_id')->nullable()->constrained('resources')->onDelete('set null')->comment('リソースID（FK）');
            $table->foreignId('menu_id')->constrained('menus')->onDelete('cascade')->comment('メニューID（FK）');
            
            // 予約識別
            $table->string('booking_number', 20)->unique()->comment('予約番号');
            
            // 日時情報
            $table->date('booking_date')->comment('予約日');
            $table->time('start_time')->comment('開始時間');
            $table->time('end_time')->comment('終了時間');
            
            // ステータス管理
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
                ->default('pending')->comment('予約ステータス');
            
            // 料金情報
            $table->integer('total_price')->default(0)->comment('総料金（円）');
            $table->integer('base_price')->default(0)->comment('基本料金');
            $table->integer('option_price')->default(0)->comment('オプション料金');
            $table->integer('resource_price')->default(0)->comment('リソース指名料');
            
            // 顧客情報（予約時点のスナップショット）
            $table->string('customer_name')->nullable()->comment('顧客名（予約時点）');
            $table->string('customer_phone', 20)->nullable()->comment('電話番号（予約時点）');
            
            // メモ・要望
            $table->text('customer_notes')->nullable()->comment('顧客要望');
            $table->text('staff_notes')->nullable()->comment('スタッフメモ');
            $table->text('internal_notes')->nullable()->comment('内部メモ');
            
            // 予約経路・承認
            $table->enum('booking_source', ['line', 'phone', 'walk_in', 'web', 'staff'])
                ->default('line')->comment('予約経路');
            $table->json('preferred_times')->nullable()->comment('希望時間（承認制の場合）');
            
            // 仮押さえシステム
            $table->string('hold_token', 64)->nullable()->comment('仮押さえトークン');
            $table->timestamp('hold_expires_at')->nullable()->comment('仮押さえ期限');
            
            // 状態変更履歴
            $table->timestamp('confirmed_at')->nullable()->comment('承認日時');
            $table->timestamp('cancelled_at')->nullable()->comment('キャンセル日時');
            $table->text('cancellation_reason')->nullable()->comment('キャンセル理由');
            $table->timestamp('completed_at')->nullable()->comment('完了日時');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['store_id', 'booking_date', 'resource_id'], 'idx_bookings_date_resource');
            $table->index(['store_id', 'status'], 'idx_bookings_status');
            $table->index(['customer_id', 'status'], 'idx_bookings_customer');
            $table->index('hold_token', 'idx_bookings_hold_token');
            $table->index(['booking_date', 'start_time'], 'idx_bookings_datetime');
            $table->index('booking_number', 'idx_bookings_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
