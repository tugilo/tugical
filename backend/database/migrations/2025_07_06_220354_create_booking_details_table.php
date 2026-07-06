<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 複数メニュー組み合わせ対応: booking_details テーブル作成
     * 
     * 用途: 1つの予約に対する複数メニューの組み合わせを管理
     * 例: 美容院でカット+カラー+パーマの組み合わせ予約
     * 
     * @return void
     */
    public function up(): void
    {
        Schema::create('booking_details', function (Blueprint $table) {
            // 基本情報
            $table->id()->comment('予約明細ID（PK）');
            $table->foreignId('booking_id')->constrained('bookings')->onDelete('cascade')->comment('予約ID（FK）');
            $table->foreignId('menu_id')->constrained('menus')->onDelete('restrict')->comment('メニューID（FK）');
            $table->foreignId('resource_id')->nullable()->constrained('resources')->onDelete('set null')->comment('担当リソースID（FK）');

            // 実施順序・サービス情報
            $table->integer('sequence_order')->default(1)->comment('実施順序（カット → カラー等）');
            $table->string('service_name')->comment('サービス名（予約時点）');
            $table->text('service_description')->nullable()->comment('サービス説明（予約時点）');

            // 料金情報
            $table->integer('base_price')->default(0)->comment('基本料金（予約時点）');
            $table->integer('resource_price_diff')->default(0)->comment('リソース料金差');
            $table->integer('detail_discount')->default(0)->comment('明細単位の割引');

            // 時間情報
            $table->integer('base_duration')->default(0)->comment('基本所要時間（分）');
            $table->integer('prep_duration')->default(0)->comment('準備時間（分）');
            $table->integer('cleanup_duration')->default(0)->comment('片付け時間（分）');
            $table->integer('total_duration')->default(0)->comment('合計所要時間（分）');
            $table->integer('start_time_offset')->default(0)->comment('予約開始からのオフセット時間（分）');
            $table->integer('end_time_offset')->default(0)->comment('予約開始からの終了オフセット時間（分）');

            // 自動追加サービス
            $table->boolean('is_auto_added')->default(false)->comment('自動追加サービスフラグ');
            $table->string('auto_add_reason')->nullable()->comment('自動追加理由');

            // JSON フィールド
            $table->json('selected_options')->nullable()->comment('選択されたオプション一覧');
            $table->json('service_attributes')->nullable()->comment('サービス属性（予約時点）');

            // 実施状況
            $table->enum('completion_status', ['pending', 'in_progress', 'completed', 'cancelled', 'skipped'])
                ->default('pending')
                ->comment('実施状況');
            $table->timestamp('actual_start_time')->nullable()->comment('実際開始時間');
            $table->timestamp('actual_end_time')->nullable()->comment('実際終了時間');

            // メモ・評価
            $table->text('staff_notes')->nullable()->comment('スタッフメモ（明細別）');
            $table->integer('customer_satisfaction')->nullable()->comment('顧客満足度（1-5）');

            // タイムスタンプ
            $table->timestamps();

            // インデックス
            $table->index(['booking_id', 'sequence_order'], 'idx_booking_details_booking_sequence');
            $table->index('menu_id', 'idx_booking_details_menu');
            $table->index('resource_id', 'idx_booking_details_resource');
        });
    }

    /**
     * マイグレーションを取り消す
     *
     * @return void
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_details');
    }
};
