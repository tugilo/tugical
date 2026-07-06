<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 店舗テーブル作成
     * 各テナントが運営する店舗の管理
     */
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade')->comment('テナントID（FK）');
            $table->string('name')->comment('店舗名');
            $table->string('slug')->unique()->comment('店舗スラッグ（URL用）');
            $table->string('display_name')->nullable()->comment('表示名');
            $table->text('description')->nullable()->comment('説明');
            
            // 業種・テンプレート
            $table->enum('industry_type', [
                'beauty', 'nail', 'clinic', 'therapy', 'rental', 'school', 'activity'
            ])->comment('業種');
            $table->json('industry_settings')->nullable()->comment('業種別設定');
            
            // 連絡先情報
            $table->string('phone', 20)->nullable()->comment('電話番号');
            $table->string('email')->nullable()->comment('メールアドレス');
            $table->text('address')->nullable()->comment('住所');
            $table->string('postal_code', 10)->nullable()->comment('郵便番号');
            $table->decimal('latitude', 10, 8)->nullable()->comment('緯度');
            $table->decimal('longitude', 11, 8)->nullable()->comment('経度');
            
            // 営業時間・カレンダー
            $table->json('business_hours')->comment('営業時間（曜日別）');
            $table->integer('time_slot_interval')->default(30)->comment('予約時間間隔（分）');
            $table->integer('advance_booking_days')->default(30)->comment('事前予約可能日数');
            $table->boolean('accept_same_day_booking')->default(true)->comment('当日予約受付');
            
            // 予約設定
            $table->enum('booking_mode', ['auto', 'manual'])->default('auto')->comment('予約承認モード');
            $table->integer('booking_limit_per_day')->default(50)->comment('日当たり予約上限');
            $table->integer('hold_minutes')->default(10)->comment('仮押さえ時間（分）');
            $table->boolean('require_customer_info')->default(false)->comment('顧客情報必須フラグ');
            
            // 通知設定
            $table->json('notification_settings')->nullable()->comment('通知設定');
            $table->boolean('send_booking_notifications')->default(true)->comment('予約通知送信');
            $table->boolean('send_reminder_notifications')->default(true)->comment('リマインダー通知送信');
            $table->integer('reminder_hours_before')->default(24)->comment('リマインダー送信時間（時間前）');
            
            // LINE連携設定
            $table->string('line_channel_id', 100)->nullable()->comment('LINE チャンネルID');
            $table->text('line_channel_secret')->nullable()->comment('LINE チャンネルシークレット（暗号化）');
            $table->text('line_access_token')->nullable()->comment('LINE アクセストークン（暗号化）');
            $table->string('line_liff_id', 100)->nullable()->comment('LIFF アプリID');
            $table->boolean('line_integration_active')->default(false)->comment('LINE連携有効フラグ');
            
            // 表示設定
            $table->string('logo_url')->nullable()->comment('ロゴ画像URL');
            $table->string('cover_image_url')->nullable()->comment('カバー画像URL');
            $table->string('theme_color', 7)->default('#10b981')->comment('テーマカラー');
            $table->json('custom_css')->nullable()->comment('カスタムCSS設定');
            
            // ステータス・メタデータ
            $table->boolean('is_active')->default(true)->comment('有効フラグ');
            $table->boolean('is_public')->default(true)->comment('公開フラグ');
            $table->json('settings')->nullable()->comment('その他設定');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['tenant_id', 'is_active'], 'idx_stores_tenant_active');
            $table->index('industry_type', 'idx_stores_industry');
            $table->index('is_public', 'idx_stores_public');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stores');
    }
};
