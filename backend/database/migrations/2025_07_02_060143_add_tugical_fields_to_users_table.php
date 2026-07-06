<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * tugical認証システム用フィールド追加マイグレーション
 * 
 * 追加フィールド:
 * - store_id: 店舗ID（マルチテナント対応）
 * - role: 役割（owner/manager/staff/reception）
 * - is_active: アカウント有効性
 * - アクティビティ追跡フィールド
 * - プロフィール・設定JSONフィールド
 * - セキュリティ関連フィールド
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */
return new class extends Migration
{
    /**
     * マイグレーション実行
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 店舗関連（マルチテナント対応）
            $table->unsignedBigInteger('store_id')->nullable()->after('id');
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');

            // 役割・権限管理
            $table->enum('role', ['owner', 'manager', 'staff', 'reception'])->default('staff')->after('email');
            $table->boolean('is_active')->default(true)->after('role');

            // アクティビティ追跡
            $table->timestamp('last_login_at')->nullable()->after('email_verified_at');
            $table->string('last_login_ip')->nullable()->after('last_login_at');
            $table->timestamp('last_activity_at')->nullable()->after('last_login_ip');

            // セキュリティ関連
            $table->timestamp('password_updated_at')->nullable()->after('password');
            $table->boolean('two_factor_enabled')->default(false)->after('password_updated_at');
            $table->text('two_factor_secret')->nullable()->after('two_factor_enabled');

            // プロフィール・設定（JSON）
            $table->json('profile')->nullable()->after('two_factor_secret')->comment('ユーザープロフィール情報');
            $table->json('preferences')->nullable()->after('profile')->comment('ユーザー設定');

            // インデックス追加（パフォーマンス最適化）
            $table->index(['store_id', 'role'], 'users_store_role_index');
            $table->index('last_login_at', 'users_last_login_index');
            $table->index('is_active', 'users_active_index');
        });
    }

    /**
     * マイグレーション巻き戻し
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // インデックス削除
            $table->dropIndex('users_store_role_index');
            $table->dropIndex('users_last_login_index');
            $table->dropIndex('users_active_index');

            // 外部キー制約削除
            $table->dropForeign(['store_id']);

            // カラム削除
            $table->dropColumn([
                'store_id',
                'role',
                'is_active',
                'last_login_at',
                'last_login_ip',
                'last_activity_at',
                'password_updated_at',
                'two_factor_enabled',
                'two_factor_secret',
                'profile',
                'preferences',
            ]);
        });
    }
};
