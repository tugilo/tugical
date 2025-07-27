<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * リソーステーブル作成（tugical_database_design_v1.0.md 準拠）
     * 統一リソース概念：スタッフ、部屋、設備、車両等を統一管理
     */
    public function up(): void
    {
        Schema::create('resources', function (Blueprint $table) {
            // 基本情報（仕様書 2.1 resources準拠）
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->foreignId('store_id')->constrained('stores')->onDelete('cascade')->comment('店舗ID（FK）');
            $table->enum('type', ['staff', 'room', 'equipment', 'vehicle'])->default('staff')->comment('リソース種別');
            $table->string('name')->comment('リソース名');
            $table->string('display_name')->nullable()->comment('表示名（業種別）');
            $table->text('description')->nullable()->comment('説明');
            $table->string('photo_url')->nullable()->comment('写真URL');
            
            // 属性情報（JSON）
            $table->json('attributes')->nullable()->comment('属性情報');
            
            // 稼働時間（JSON）
            $table->json('working_hours')->nullable()->comment('稼働時間');
            
            // 効率・料金・収容
            $table->decimal('efficiency_rate', 3, 2)->default(1.00)->comment('作業効率率');
            $table->integer('hourly_rate_diff')->default(0)->comment('指名料金差（円）');
            $table->integer('capacity')->default(1)->comment('収容・対応人数');
            
            // 管理情報
            $table->integer('sort_order')->default(0)->comment('表示順序');
            $table->boolean('is_active')->default(true)->comment('有効フラグ');
            
            // タイムスタンプ
            $table->timestamps();
            
            // インデックス（仕様書通り）
            $table->index(['store_id', 'type'], 'idx_resources_type');
            $table->index(['store_id', 'is_active'], 'idx_resources_active');
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
