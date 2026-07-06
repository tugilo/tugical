<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 通知テンプレートテーブル作成
     * LINE通知メッセージのテンプレート管理
     */
    public function up(): void
    {
        Schema::create('notification_templates', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->string('name')->comment('テンプレート名');
            $table->string('key')->comment('テンプレートキー（システム用）');
            $table->text('description')->nullable()->comment('説明');
            
            // 通知種別・分類
            $table->enum('type', [
                'booking_confirmed', 'booking_cancelled', 'booking_reminder', 
                'booking_completed', 'booking_no_show', 'promotional', 
                'system', 'custom'
            ])->comment('通知種別');
            $table->enum('channel', ['line', 'email', 'sms', 'push'])
                ->default('line')->comment('通知チャンネル');
            
            // メッセージ内容
            $table->string('subject')->nullable()->comment('件名（メール用）');
            $table->text('message_template')->comment('メッセージテンプレート');
            $table->json('variables')->nullable()->comment('利用可能変数一覧');
            
            // リッチコンテンツ
            $table->json('rich_template')->nullable()->comment('リッチメッセージテンプレート');
            $table->string('image_url')->nullable()->comment('画像URL');
            $table->json('action_buttons')->nullable()->comment('アクションボタン設定');
            
            // 送信設定
            $table->boolean('is_active')->default(true)->comment('有効フラグ');
            $table->boolean('auto_send')->default(true)->comment('自動送信フラグ');
            $table->integer('send_delay_minutes')->default(0)->comment('送信遅延時間（分）');
            
            // 条件・制約
            $table->json('send_conditions')->nullable()->comment('送信条件');
            $table->json('recipient_filters')->nullable()->comment('受信者フィルター');
            
            // 業種・カスタマイズ
            $table->json('industry_customization')->nullable()->comment('業種別カスタマイズ');
            $table->boolean('allow_customization')->default(true)->comment('カスタマイズ許可');
            
            // バージョン管理
            $table->integer('version')->default(1)->comment('バージョン番号');
            $table->timestamp('last_used_at')->nullable()->comment('最終使用日時');
            $table->integer('usage_count')->default(0)->comment('使用回数');
            
            // メタデータ
            $table->json('metadata')->nullable()->comment('メタデータ');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['store_id', 'type', 'is_active'], 'idx_notification_templates_store_type');
            $table->index(['store_id', 'key'], 'idx_notification_templates_key');
            $table->index(['channel', 'is_active'], 'idx_notification_templates_channel');
            $table->index('last_used_at', 'idx_notification_templates_usage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
}; 