<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 通知テーブル作成
     * LINE通知の送信履歴とステータス管理
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null')->comment('顧客ID（FK）');
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->onDelete('set null')->comment('予約ID（FK）');
            $table->bigInteger('notification_template_id')->unsigned()->nullable()->comment('テンプレートID（FK）');
            
            // 通知種別・分類
            $table->enum('type', [
                'booking_confirmed', 'booking_cancelled', 'booking_reminder', 
                'booking_completed', 'booking_no_show', 'promotional', 
                'system', 'custom'
            ])->comment('通知種別');
            $table->enum('channel', ['line', 'email', 'sms', 'push'])
                ->default('line')->comment('通知チャンネル');
            
            // 受信者情報
            $table->string('recipient_id', 100)->comment('受信者ID（LINE User ID等）');
            $table->string('recipient_name')->nullable()->comment('受信者名');
            
            // メッセージ内容
            $table->string('title')->nullable()->comment('タイトル');
            $table->text('message')->comment('メッセージ本文');
            $table->json('template_variables')->nullable()->comment('テンプレート変数');
            $table->json('rich_content')->nullable()->comment('リッチコンテンツ（画像、ボタン等）');
            
            // 送信管理
            $table->enum('status', ['pending', 'sent', 'delivered', 'failed', 'cancelled'])
                ->default('pending')->comment('送信ステータス');
            $table->timestamp('scheduled_at')->nullable()->comment('送信予定日時');
            $table->timestamp('sent_at')->nullable()->comment('送信日時');
            $table->timestamp('delivered_at')->nullable()->comment('配信確認日時');
            
            // エラー・再送管理
            $table->text('error_message')->nullable()->comment('エラーメッセージ');
            $table->integer('retry_count')->default(0)->comment('再送回数');
            $table->timestamp('next_retry_at')->nullable()->comment('次回再送日時');
            $table->integer('max_retries')->default(3)->comment('最大再送回数');
            
            // 外部システム連携
            $table->string('external_id')->nullable()->comment('外部システムメッセージID');
            $table->json('external_response')->nullable()->comment('外部システムレスポンス');
            
            // 分析・統計
            $table->boolean('is_read')->default(false)->comment('既読フラグ');
            $table->timestamp('read_at')->nullable()->comment('既読日時');
            $table->boolean('is_clicked')->default(false)->comment('リンククリックフラグ');
            $table->timestamp('clicked_at')->nullable()->comment('クリック日時');
            
            // メタデータ
            $table->json('metadata')->nullable()->comment('メタデータ');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['store_id', 'status'], 'idx_notifications_store_status');
            $table->index(['customer_id', 'type'], 'idx_notifications_customer_type');
            $table->index(['booking_id'], 'idx_notifications_booking');
            $table->index(['scheduled_at', 'status'], 'idx_notifications_schedule');
            $table->index(['recipient_id', 'channel'], 'idx_notifications_recipient');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
}; 