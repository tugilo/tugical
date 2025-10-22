<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * メニューテーブル作成
     * サービスメニューの管理（美容、医療、レンタル等）
     */
    public function up(): void
    {
        Schema::create('menus', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->string('name')->comment('メニュー名');
            $table->string('display_name')->nullable()->comment('表示名');
            $table->text('description')->nullable()->comment('説明');
            $table->text('detailed_description')->nullable()->comment('詳細説明');
            
            // カテゴリー・分類
            $table->string('category', 100)->nullable()->comment('カテゴリー');
            $table->json('tags')->nullable()->comment('タグ（検索用）');
            $table->enum('service_type', ['individual', 'group', 'course', 'subscription'])
                ->default('individual')->comment('サービス種別');
            
            // 時間・料金
            $table->integer('base_duration')->comment('基本所要時間（分）');
            $table->integer('prep_duration')->default(0)->comment('準備時間（分）');
            $table->integer('cleanup_duration')->default(0)->comment('片付け時間（分）');
            $table->integer('buffer_duration')->default(0)->comment('バッファ時間（分）');
            $table->integer('base_price')->comment('基本料金（円）');
            
            // 料金設定
            $table->json('pricing_options')->nullable()->comment('料金オプション');
            $table->boolean('price_varies_by_resource')->default(false)->comment('リソース別料金フラグ');
            $table->boolean('price_varies_by_time')->default(false)->comment('時間帯別料金フラグ');
            $table->json('time_based_pricing')->nullable()->comment('時間帯別料金設定');
            
            // 予約制約
            $table->boolean('requires_resource')->default(false)->comment('リソース指定必須フラグ');
            $table->json('allowed_resource_types')->nullable()->comment('利用可能リソース種別');
            $table->json('required_resources')->nullable()->comment('必須リソース一覧');
            $table->integer('min_participants')->default(1)->comment('最小参加人数');
            $table->integer('max_participants')->default(1)->comment('最大参加人数');
            
            // 年齢・性別制限
            $table->integer('min_age')->nullable()->comment('最小年齢');
            $table->integer('max_age')->nullable()->comment('最大年齢');
            $table->enum('gender_restriction', ['none', 'male_only', 'female_only'])
                ->default('none')->comment('性別制限');
            
            // 予約設定
            $table->integer('advance_booking_hours')->default(1)->comment('事前予約必要時間');
            $table->integer('cancellation_hours')->default(24)->comment('キャンセル可能時間');
            $table->json('booking_rules')->nullable()->comment('予約ルール');
            $table->boolean('allow_online_booking')->default(true)->comment('オンライン予約許可');
            $table->boolean('require_approval')->default(false)->comment('承認必要フラグ');
            
            // 表示・画像
            $table->string('image_url')->nullable()->comment('メイン画像URL');
            $table->json('image_gallery')->nullable()->comment('画像ギャラリー');
            $table->string('icon_class')->nullable()->comment('アイコンクラス');
            $table->string('background_color', 7)->nullable()->comment('背景色');
            
            // 並び順・優先度
            $table->integer('sort_order')->default(0)->comment('表示順序');
            $table->boolean('is_featured')->default(false)->comment('おすすめフラグ');
            $table->boolean('is_popular')->default(false)->comment('人気フラグ');
            $table->boolean('is_new')->default(false)->comment('新着フラグ');
            
            // ステータス・メタデータ
            $table->boolean('is_active')->default(true)->comment('有効フラグ');
            $table->boolean('is_bookable')->default(true)->comment('予約可能フラグ');
            $table->json('settings')->nullable()->comment('その他設定');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['store_id', 'is_active'], 'idx_menus_store_active');
            $table->index(['store_id', 'category'], 'idx_menus_category');
            $table->index(['store_id', 'is_bookable'], 'idx_menus_bookable');
            $table->index('sort_order', 'idx_menus_sort');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menus');
    }
};
