<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * スタッフアカウントテーブル作成
     * 管理画面へのログイン認証とアクセス制御
     */
    public function up(): void
    {
        Schema::create('staff_accounts', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->foreignId('resource_id')->nullable()->constrained('resources')->onDelete('set null')->comment('リソースID（FK）');
            
            // 認証情報
            $table->string('email')->unique()->comment('メールアドレス（ログインID）');
            $table->timestamp('email_verified_at')->nullable()->comment('メール認証日時');
            $table->string('password')->comment('パスワード（暗号化）');
            $table->string('remember_token')->nullable()->comment('ログイン保持トークン');
            
            // 二要素認証
            $table->boolean('two_factor_enabled')->default(false)->comment('二要素認証有効フラグ');
            $table->text('two_factor_secret')->nullable()->comment('二要素認証シークレット（暗号化）');
            $table->text('two_factor_recovery_codes')->nullable()->comment('リカバリーコード（暗号化）');
            
            // 権限・役割
            $table->enum('role', ['admin', 'manager', 'staff', 'viewer'])
                ->default('staff')->comment('役割');
            $table->json('permissions')->nullable()->comment('詳細権限設定');
            $table->boolean('can_manage_bookings')->default(true)->comment('予約管理権限');
            $table->boolean('can_manage_customers')->default(false)->comment('顧客管理権限');
            $table->boolean('can_manage_menus')->default(false)->comment('メニュー管理権限');
            $table->boolean('can_manage_staff')->default(false)->comment('スタッフ管理権限');
            $table->boolean('can_view_reports')->default(false)->comment('レポート閲覧権限');
            $table->boolean('can_manage_settings')->default(false)->comment('設定管理権限');
            
            // 個人情報
            $table->string('first_name')->comment('名');
            $table->string('last_name')->comment('姓');
            $table->string('display_name')->nullable()->comment('表示名');
            $table->string('phone', 20)->nullable()->comment('電話番号');
            $table->date('hire_date')->nullable()->comment('入社日');
            $table->enum('employment_type', ['full_time', 'part_time', 'contract', 'intern'])
                ->default('full_time')->comment('雇用形態');
            
            // 勤務設定
            $table->json('working_schedule')->nullable()->comment('勤務スケジュール');
            $table->boolean('can_receive_bookings')->default(true)->comment('予約受付可能フラグ');
            $table->integer('max_bookings_per_day')->default(10)->comment('日当たり最大予約数');
            
            // セッション・セキュリティ
            $table->timestamp('last_login_at')->nullable()->comment('最終ログイン日時');
            $table->string('last_login_ip', 45)->nullable()->comment('最終ログインIP');
            $table->integer('failed_login_attempts')->default(0)->comment('ログイン失敗回数');
            $table->timestamp('locked_until')->nullable()->comment('アカウントロック解除日時');
            $table->timestamp('password_changed_at')->nullable()->comment('パスワード変更日時');
            $table->boolean('must_change_password')->default(false)->comment('パスワード変更強制フラグ');
            
            // 通知設定
            $table->json('notification_preferences')->nullable()->comment('通知設定');
            $table->boolean('receive_booking_notifications')->default(true)->comment('予約通知受信');
            $table->boolean('receive_system_notifications')->default(true)->comment('システム通知受信');
            
            // ステータス・メタデータ
            $table->boolean('is_active')->default(true)->comment('有効フラグ');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['store_id', 'is_active'], 'idx_staff_accounts_store_active');
            $table->index('role', 'idx_staff_accounts_role');
            $table->index('last_login_at', 'idx_staff_accounts_last_login');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_accounts');
    }
};
