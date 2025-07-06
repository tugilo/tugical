<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 複数メニュー組み合わせ対応: bookingsテーブル更新
     * 
     * 変更内容:
     * - menu_idを削除（詳細はbooking_detailsテーブルで管理）
     * - 複数メニュー組み合わせ対応のカラムを追加
     * 
     * @return void
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // 複数メニュー組み合わせ対応カラム追加
            $table->enum('booking_type', ['single', 'combination'])
                ->default('single')
                ->after('customer_id')
                ->comment('予約タイプ（単一・組み合わせ）');

            $table->integer('base_total_price')
                ->default(0)
                ->after('total_price')
                ->comment('基本合計料金（割引前）');

            $table->integer('set_discount_amount')
                ->default(0)
                ->after('base_total_price')
                ->comment('セット割引金額');

            $table->json('auto_added_services')
                ->nullable()
                ->after('set_discount_amount')
                ->comment('自動追加サービス一覧');

            $table->json('combination_rules')
                ->nullable()
                ->after('auto_added_services')
                ->comment('組み合わせルール（割引・自動追加）');

            $table->json('phone_booking_context')
                ->nullable()
                ->after('combination_rules')
                ->comment('電話予約コンテキスト');

            // menu_idをnullableに変更（完全削除は次のマイグレーションで）
            $table->unsignedBigInteger('menu_id')->nullable()->change();
        });
    }

    /**
     * マイグレーションを取り消す
     *
     * @return void
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // 追加したカラムを削除
            $table->dropColumn([
                'booking_type',
                'base_total_price',
                'set_discount_amount',
                'auto_added_services',
                'combination_rules',
                'phone_booking_context'
            ]);

            // menu_idをNOT NULLに戻す
            $table->unsignedBigInteger('menu_id')->nullable(false)->change();
        });
    }
};
