<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 営業カレンダーテーブル作成
     * 営業日・定休日・特別営業時間・イベントの管理
     */
    public function up(): void
    {
        Schema::create('business_calendars', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->foreignId('resource_id')->nullable()->constrained('resources')->onDelete('cascade')->comment('リソースID（FK）');
            
            // 日程情報
            $table->date('date')->comment('対象日');
            $table->enum('type', ['holiday', 'special_hours', 'event', 'maintenance', 'unavailable'])
                ->comment('カレンダー種別');
            $table->string('title')->comment('タイトル');
            $table->text('description')->nullable()->comment('説明');
            
            // 営業時間設定
            $table->boolean('is_open')->default(true)->comment('営業フラグ');
            $table->time('open_time')->nullable()->comment('開店時間');
            $table->time('close_time')->nullable()->comment('閉店時間');
            $table->json('special_hours')->nullable()->comment('特別営業時間設定');
            
            // 予約制限
            $table->boolean('accept_bookings')->default(true)->comment('予約受付フラグ');
            $table->integer('booking_limit')->nullable()->comment('予約上限数');
            $table->json('restricted_services')->nullable()->comment('制限サービス一覧');
            $table->json('restricted_resources')->nullable()->comment('制限リソース一覧');
            
            // 繰り返し設定
            $table->boolean('is_recurring')->default(false)->comment('繰り返しフラグ');
            $table->enum('recurrence_type', ['weekly', 'monthly', 'yearly'])->nullable()->comment('繰り返し種別');
            $table->json('recurrence_pattern')->nullable()->comment('繰り返しパターン');
            $table->date('recurrence_end_date')->nullable()->comment('繰り返し終了日');
            
            // 色・表示設定
            $table->string('color', 7)->default('#ff0000')->comment('表示色');
            $table->string('background_color', 7)->nullable()->comment('背景色');
            $table->string('text_color', 7)->default('#ffffff')->comment('文字色');
            
            // 通知・告知
            $table->boolean('notify_customers')->default(false)->comment('顧客通知フラグ');
            $table->text('notification_message')->nullable()->comment('通知メッセージ');
            $table->integer('notify_days_before')->default(7)->comment('事前通知日数');
            
            // メタデータ・作成者
            $table->foreignId('created_by')->nullable()->constrained('staff_accounts')->onDelete('set null')->comment('作成者ID');
            $table->json('metadata')->nullable()->comment('メタデータ');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['store_id', 'date'], 'idx_business_calendars_store_date');
            $table->index(['store_id', 'type'], 'idx_business_calendars_type');
            $table->index(['resource_id', 'date'], 'idx_business_calendars_resource_date');
            $table->index(['date', 'is_open'], 'idx_business_calendars_date_open');
            $table->index('is_recurring', 'idx_business_calendars_recurring');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('business_calendars');
    }
}; 