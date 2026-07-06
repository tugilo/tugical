<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * 顧客テーブル作成
     * LINE連携による顧客情報管理とロイヤリティプログラム
     */
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->string('line_user_id', 100)->comment('LINE ユーザーID');
            $table->string('line_display_name')->nullable()->comment('LINE表示名');
            $table->string('line_picture_url')->nullable()->comment('LINEプロフィール画像');
            
            // 個人情報
            $table->string('name')->nullable()->comment('氏名');
            $table->string('name_kana')->nullable()->comment('氏名カナ');
            $table->string('phone', 20)->nullable()->comment('電話番号');
            $table->string('email')->nullable()->comment('メールアドレス');
            $table->date('birthday')->nullable()->comment('生年月日');
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->comment('性別');
            $table->text('address')->nullable()->comment('住所');
            
            // 顧客固有情報
            $table->text('notes')->nullable()->comment('備考・要望');
            $table->text('allergies')->nullable()->comment('アレルギー情報');
            $table->json('preferences')->nullable()->comment('個人設定');
            
            // ロイヤリティ管理
            $table->enum('loyalty_rank', ['new', 'regular', 'vip', 'premium'])
                ->default('regular')->comment('顧客ランク');
            $table->integer('total_bookings')->default(0)->comment('総予約回数');
            $table->integer('total_spent')->default(0)->comment('総利用金額');
            $table->integer('no_show_count')->default(0)->comment('無断キャンセル回数');
            $table->timestamp('last_no_show_at')->nullable()->comment('最終無断キャンセル日');
            
            // 制限・ステータス管理
            $table->boolean('is_restricted')->default(false)->comment('予約制限フラグ');
            $table->timestamp('restriction_until')->nullable()->comment('制限解除日時');
            $table->boolean('is_active')->default(true)->comment('有効フラグ');
            
            // 通知設定
            $table->json('notification_settings')->nullable()->comment('通知設定');
            
            // 来店履歴
            $table->timestamp('first_visit_at')->nullable()->comment('初回来店日');
            $table->timestamp('last_visit_at')->nullable()->comment('最終来店日');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->unique(['store_id', 'line_user_id'], 'uk_customers_store_line');
            $table->index(['store_id', 'phone'], 'idx_customers_phone');
            $table->index(['store_id', 'loyalty_rank'], 'idx_customers_rank');
            $table->index(['store_id', 'is_active'], 'idx_customers_active');
            $table->index('total_bookings', 'idx_customers_bookings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
