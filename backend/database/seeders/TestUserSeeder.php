<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

/**
 * TestUserSeeder
 * 
 * tugical API統合テスト用ユーザーデータ作成
 * 
 * 作成データ:
 * - 4つの役割（owner, manager, staff, reception）のテストユーザー
 * - 2つのテスト店舗（美容院、整体院）
 * - 各ユーザーの基本設定・プロフィール
 * 
 * 使用目的:
 * - Postman API統合テスト
 * - 認証フロー検証
 * - 権限ベースアクセス制御テスト
 * 
 * @package Database\Seeders
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */
class TestUserSeeder extends Seeder
{
    /**
     * テストデータ作成実行
     */
    public function run(): void
    {
        // 外部キー制約を一時的に無効化
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        try {
            // 認証テスト用ユーザー作成（store_id=1固定）
            $storeId = 1;
            $this->createTestUsers($storeId);

            $this->command->info('✅ テストユーザーデータ作成完了');
            $this->command->info('');
            $this->command->info('=== API統合テスト用ログイン情報 ===');
            $this->command->info('');
            $this->command->info('🏪 店舗（store_id: ' . $storeId . '）');
            $this->command->info('  👑 オーナー: owner@tugical.test / password123');
            $this->command->info('  👔 マネージャー: manager@tugical.test / password123');
            $this->command->info('  👨‍💼 スタッフ: staff@tugical.test / password123');
            $this->command->info('  📞 受付: reception@tugical.test / password123');
            $this->command->info('');
            $this->command->info('📋 Postmanテスト用エンドポイント:');
            $this->command->info('  POST /api/v1/auth/login');
            $this->command->info('  GET  /api/v1/auth/user');
            $this->command->info('  POST /api/v1/auth/logout');
            $this->command->info('');
            $this->command->info('🔗 テスト用リクエスト例:');
            $this->command->info('  curl -X POST http://localhost/api/v1/auth/login \\');
            $this->command->info('    -H "Content-Type: application/json" \\');
            $this->command->info('    -d \'{"email":"owner@tugical.test","password":"password123","store_id":' . $storeId . '}\'');

        } finally {
            // 外部キー制約を再有効化
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        }
    }

    /**
     * テストユーザー作成
     * 
     * @param int $storeId 店舗ID
     * @param array $roles 作成する役割（デフォルト: 全役割）
     * @return void
     */
    private function createTestUsers(int $storeId, array $roles = ['owner', 'manager', 'staff', 'reception']): void
    {
        foreach ($roles as $role) {
            $userData = $this->getUserData($role, $storeId);
            User::create($userData);
        }
    }

    /**
     * 役割別ユーザーデータ取得
     * 
     * @param string $role 役割
     * @param int $storeId 店舗ID
     * @return array ユーザーデータ
     */
    private function getUserData(string $role, int $storeId): array
    {
        $roleNames = [
            'owner' => 'オーナー',
            'manager' => 'マネージャー',
            'staff' => 'スタッフ',
            'reception' => '受付',
        ];

        $displayName = $roleNames[$role] ?? $role;

        return [
            'store_id' => $storeId,
            'name' => "テスト{$displayName}",
            'email' => "{$role}@tugical.test",
            'password' => Hash::make('password123'),
            'role' => $role,
            'is_active' => true,
            'email_verified_at' => now(),
            'profile' => [
                'display_name' => "テスト{$displayName}",
                'phone' => $this->generateTestPhone($role),
                'timezone' => 'Asia/Tokyo',
                'language' => 'ja',
            ],
            'preferences' => [
                'notifications' => true,
                'email_notifications' => $role === 'owner',
                'dashboard_layout' => $role === 'owner' ? 'advanced' : 'simple',
                'date_format' => 'Y-m-d',
                'time_format' => 'H:i',
                'theme' => 'light',
                'language' => 'ja',
            ],
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /**
     * テスト用電話番号生成
     * 
     * @param string $role 役割
     * @return string 電話番号
     */
    private function generateTestPhone(string $role): string
    {
        $phoneMap = [
            'owner' => '090-1111-1111',
            'manager' => '090-2222-2222',
            'staff' => '090-3333-3333',
            'reception' => '090-4444-4444',
        ];

        return $phoneMap[$role] ?? '090-0000-0000';
    }
}
