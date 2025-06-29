<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * テナント（事業者）テーブル作成
     * マルチテナント管理のベースとなるテーブル
     */
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->string('name')->comment('事業者名');
            $table->string('name_kana')->nullable()->comment('事業者名カナ');
            $table->string('company_name')->nullable()->comment('会社名');
            $table->string('representative')->nullable()->comment('代表者名');
            
            // 連絡先情報
            $table->string('email')->unique()->comment('メールアドレス');
            $table->string('phone', 20)->nullable()->comment('電話番号');
            $table->text('address')->nullable()->comment('住所');
            $table->string('postal_code', 10)->nullable()->comment('郵便番号');
            
            // プラン・制限情報
            $table->enum('plan', ['trial', 'basic', 'standard', 'premium'])
                ->default('trial')
                ->comment('プラン種別');
            $table->integer('max_stores')->default(1)->comment('最大店舗数');
            $table->integer('max_bookings_per_month')->default(100)->comment('月間最大予約数');
            $table->integer('max_staff_per_store')->default(5)->comment('店舗当たり最大スタッフ数');
            
            // 契約・支払い情報
            $table->enum('billing_cycle', ['monthly', 'annual'])->default('monthly')->comment('請求サイクル');
            $table->integer('monthly_fee')->default(0)->comment('月額料金（円）');
            $table->timestamp('trial_ends_at')->nullable()->comment('トライアル終了日');
            $table->timestamp('contract_starts_at')->nullable()->comment('契約開始日');
            $table->timestamp('contract_ends_at')->nullable()->comment('契約終了日');
            
            // ステータス管理
            $table->enum('status', ['active', 'suspended', 'cancelled'])->default('active')->comment('ステータス');
            $table->boolean('is_test_account')->default(false)->comment('テストアカウントフラグ');
            $table->text('suspension_reason')->nullable()->comment('停止理由');
            
            // メタデータ
            $table->json('settings')->nullable()->comment('テナント設定');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['status', 'plan'], 'idx_tenants_status_plan');
            $table->index('contract_ends_at', 'idx_tenants_contract_end');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
