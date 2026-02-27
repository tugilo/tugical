<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * メニューオプションテーブル作成
     * 各メニューに追加可能なオプションサービス
     */
    public function up(): void
    {
        Schema::create('menu_options', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('menu_id')->constrained('menus')->onDelete('cascade')->comment('メニューID（FK）');
            $table->string('name')->comment('オプション名');
            $table->string('display_name')->nullable()->comment('表示名');
            $table->text('description')->nullable()->comment('説明');
            
            // 分類・種別
            $table->enum('option_type', ['addon', 'upgrade', 'material', 'service'])
                ->comment('オプション種別');
            $table->string('category', 100)->nullable()->comment('カテゴリー');
            
            // 料金・時間
            $table->integer('price')->default(0)->comment('追加料金（円）');
            $table->integer('duration')->default(0)->comment('追加時間（分）');
            $table->enum('pricing_type', ['fixed', 'percentage', 'per_unit'])
                ->default('fixed')->comment('料金計算方法');
            $table->decimal('pricing_value', 8, 2)->nullable()->comment('料金計算値');
            
            // 選択・制約
            $table->boolean('is_required')->default(false)->comment('必須オプションフラグ');
            $table->boolean('is_multiple_selectable')->default(false)->comment('複数選択可能フラグ');
            $table->integer('max_quantity')->default(1)->comment('最大選択数');
            $table->integer('min_quantity')->default(0)->comment('最小選択数');
            
            // 利用可能条件
            $table->json('available_resources')->nullable()->comment('利用可能リソース');
            $table->json('required_conditions')->nullable()->comment('利用条件');
            $table->integer('min_age')->nullable()->comment('最小年齢');
            $table->integer('max_age')->nullable()->comment('最大年齢');
            
            // 在庫・予約制約
            $table->boolean('has_inventory')->default(false)->comment('在庫管理フラグ');
            $table->integer('stock_quantity')->nullable()->comment('在庫数');
            $table->integer('daily_limit')->nullable()->comment('日次制限数');
            $table->boolean('requires_advance_booking')->default(false)->comment('事前予約必要フラグ');
            
            // 表示・UI
            $table->string('image_url')->nullable()->comment('画像URL');
            $table->string('icon_class')->nullable()->comment('アイコンクラス');
            $table->string('background_color', 7)->nullable()->comment('背景色');
            $table->integer('sort_order')->default(0)->comment('表示順序');
            
            // ステータス
            $table->boolean('is_active')->default(true)->comment('有効フラグ');
            $table->boolean('is_featured')->default(false)->comment('おすすめフラグ');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['menu_id', 'is_active'], 'idx_menu_options_menu_active');
            $table->index(['menu_id', 'option_type'], 'idx_menu_options_type');
            $table->index('sort_order', 'idx_menu_options_sort');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_options');
    }
};
