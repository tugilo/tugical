<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * エンティティ画像（メニュー・リソース）1対多管理テーブル
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('entity_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')
                ->constrained('stores')
                ->cascadeOnDelete()
                ->comment('店舗ID（テナント分離）');
            $table->string('imageable_type')->comment('親種別（menu / resource）');
            $table->unsignedBigInteger('imageable_id')->comment('親ID');
            $table->string('url', 500)->comment('画像URL（/storage/...）');
            $table->unsignedInteger('sort_order')->default(0)->comment('表示順');
            $table->boolean('is_primary')->default(false)->comment('メイン画像フラグ');
            $table->timestamps();

            $table->index(['imageable_type', 'imageable_id'], 'entity_images_imageable_index');
            $table->index(['store_id', 'imageable_type', 'imageable_id'], 'entity_images_store_imageable_index');
        });

        // 既存の単一画像を 1:N テーブルへ移行（morph map: menu / resource）
        $now = now();

        $menus = DB::table('menus')
            ->whereNotNull('image_url')
            ->where('image_url', '!=', '')
            ->select(['id', 'store_id', 'image_url'])
            ->get();

        foreach ($menus as $menu) {
            DB::table('entity_images')->insert([
                'store_id' => $menu->store_id,
                'imageable_type' => 'menu',
                'imageable_id' => $menu->id,
                'url' => $menu->image_url,
                'sort_order' => 0,
                'is_primary' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $resources = DB::table('resources')
            ->whereNotNull('photo_url')
            ->where('photo_url', '!=', '')
            ->select(['id', 'store_id', 'photo_url'])
            ->get();

        foreach ($resources as $resource) {
            DB::table('entity_images')->insert([
                'store_id' => $resource->store_id,
                'imageable_type' => 'resource',
                'imageable_id' => $resource->id,
                'url' => $resource->photo_url,
                'sort_order' => 0,
                'is_primary' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entity_images');
    }
};
