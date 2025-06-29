<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * リソーステーブル作成
     * 統一リソース概念：スタッフ、部屋、設備、車両等を統一管理
     */
    public function up(): void
    {
        Schema::create('resources', function (Blueprint $table) {
            // 基本情報
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->enum('type', ['staff', 'room', 'equipment', 'vehicle'])
                ->comment('リソース種別');
            $table->string('name')->comment('リソース名');
            $table->string('display_name')->nullable()->comment('表示名');
            $table->text('description')->nullable()->comment('説明');
            
            // 属性・スキル
            $table->json('attributes')->nullable()->comment('属性情報（業種固有）');
            $table->json('specialties')->nullable()->comment('専門分野・得意技術');
            $table->enum('skill_level', ['beginner', 'intermediate', 'advanced', 'expert'])
                ->nullable()->comment('技能レベル');
            $table->decimal('efficiency_rate', 3, 2)->default(1.00)->comment('作業効率率（0.8-1.2）');
            
            // 利用料金・制約
            $table->integer('hourly_rate_diff')->default(0)->comment('時間料金差額（円）');
            $table->integer('capacity')->default(1)->comment('収容人数・定員');
            $table->json('equipment_list')->nullable()->comment('設備一覧（room/equipmentの場合）');
            
            // 制約・条件
            $table->enum('gender_restriction', ['none', 'male_only', 'female_only'])
                ->default('none')->comment('性別制限');
            $table->integer('min_age')->nullable()->comment('最低年齢');
            $table->integer('max_age')->nullable()->comment('最高年齢');
            $table->json('requirements')->nullable()->comment('利用条件');
            
            // 稼働時間・スケジュール
            $table->json('working_hours')->nullable()->comment('稼働時間（曜日別）');
            $table->boolean('allow_overtime')->default(false)->comment('時間外対応可能');
            $table->integer('break_time_minutes')->default(0)->comment('予約間休憩時間（分）');
            $table->json('unavailable_dates')->nullable()->comment('利用不可日');
            
            // 優先度・並び順
            $table->integer('sort_order')->default(0)->comment('表示順序');
            $table->integer('priority_level')->default(1)->comment('優先度（1-5）');
            $table->boolean('is_featured')->default(false)->comment('おすすめフラグ');
            $table->boolean('allow_designation')->default(true)->comment('指名可能フラグ');
            
            // 画像・表示
            $table->string('profile_image_url')->nullable()->comment('プロフィール画像URL');
            $table->json('image_gallery')->nullable()->comment('画像ギャラリー');
            $table->string('background_color', 7)->nullable()->comment('背景色');
            
            // ステータス・メタデータ
            $table->boolean('is_active')->default(true)->comment('有効フラグ');
            $table->boolean('is_bookable')->default(true)->comment('予約可能フラグ');
            $table->json('settings')->nullable()->comment('その他設定');
            $table->text('notes')->nullable()->comment('備考');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス
            $table->index(['store_id', 'type', 'is_active'], 'idx_resources_store_type_active');
            $table->index(['store_id', 'is_bookable'], 'idx_resources_bookable');
            $table->index('sort_order', 'idx_resources_sort');
            $table->index('priority_level', 'idx_resources_priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resources');
    }
};
