<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
  /**
   * Run the migrations.
   * 
   * 顧客住所の構造化改善
   * - 郵便番号・都道府県・市区町村の個別フィールド追加
   * - 住所検索・フィルタリング機能向上
   * - 既存のaddressフィールドは後方互換性のため保持
   */
  public function up(): void
  {
    Schema::table('customers', function (Blueprint $table) {
      // 構造化住所フィールド追加
      $table->string('postal_code', 10)->nullable()->after('address')->comment('郵便番号');
      $table->string('prefecture', 10)->nullable()->after('postal_code')->comment('都道府県');
      $table->string('city', 50)->nullable()->after('prefecture')->comment('市区町村');
      $table->string('address_line1', 100)->nullable()->after('city')->comment('町域・番地');
      $table->string('address_line2', 100)->nullable()->after('address_line1')->comment('建物名・部屋番号');

      // 検索用インデックス追加
      $table->index(['store_id', 'prefecture'], 'idx_customers_prefecture');
      $table->index(['store_id', 'city'], 'idx_customers_city');
      $table->index(['store_id', 'postal_code'], 'idx_customers_postal');
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('customers', function (Blueprint $table) {
      // インデックス削除
      $table->dropIndex('idx_customers_prefecture');
      $table->dropIndex('idx_customers_city');
      $table->dropIndex('idx_customers_postal');

      // カラム削除
      $table->dropColumn([
        'postal_code',
        'prefecture',
        'city',
        'address_line1',
        'address_line2'
      ]);
    });
  }
};
