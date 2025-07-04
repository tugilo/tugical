<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Customer;
use Illuminate\Support\Str;

class CustomerSeeder extends Seeder
{
    /**
     * 顧客テストデータを作成
     * 各ロイヤリティランクの顧客を複数作成
     */
    public function run(): void
    {
        $storeId = 1; // テスト店舗ID

        $customers = [
            // プラチナ会員
            [
                'name' => '山田 太郎',
                'phone' => '090-1234-5678',
                'email' => 'yamada@example.com',
                'loyalty_rank' => 'premium',
                'total_bookings' => 120,
                'total_spent' => 580000,
                'last_visit_at' => now()->subDays(3),
                'is_active' => true,
            ],
            [
                'name' => '佐藤 花子',
                'phone' => '090-2345-6789',
                'email' => 'sato@example.com',
                'loyalty_rank' => 'premium',
                'total_bookings' => 98,
                'total_spent' => 450000,
                'last_visit_at' => now()->subDays(7),
                'is_active' => true,
            ],
            // ゴールド会員
            [
                'name' => '鈴木 一郎',
                'phone' => '090-3456-7890',
                'email' => 'suzuki@example.com',
                'loyalty_rank' => 'vip',
                'total_bookings' => 65,
                'total_spent' => 280000,
                'last_visit_at' => now()->subDays(10),
                'is_active' => true,
            ],
            [
                'name' => '田中 美咲',
                'phone' => '090-4567-8901',
                'email' => 'tanaka@example.com',
                'loyalty_rank' => 'vip',
                'total_bookings' => 52,
                'total_spent' => 220000,
                'last_visit_at' => now()->subDays(14),
                'is_active' => true,
            ],
            // シルバー会員
            [
                'name' => '高橋 健太',
                'phone' => '090-5678-9012',
                'email' => 'takahashi@example.com',
                'loyalty_rank' => 'regular',
                'total_bookings' => 28,
                'total_spent' => 95000,
                'last_visit_at' => now()->subDays(21),
                'is_active' => true,
            ],
            [
                'name' => '伊藤 さくら',
                'phone' => '090-6789-0123',
                'email' => 'ito@example.com',
                'loyalty_rank' => 'regular',
                'total_bookings' => 24,
                'total_spent' => 82000,
                'last_visit_at' => now()->subDays(30),
                'is_active' => true,
            ],
            // ブロンズ会員
            [
                'name' => '渡辺 翔太',
                'phone' => '090-7890-1234',
                'email' => 'watanabe@example.com',
                'loyalty_rank' => 'new',
                'total_bookings' => 8,
                'total_spent' => 28000,
                'last_visit_at' => now()->subDays(45),
                'is_active' => true,
            ],
            [
                'name' => '中村 愛',
                'phone' => '090-8901-2345',
                'email' => 'nakamura@example.com',
                'loyalty_rank' => 'new',
                'total_bookings' => 5,
                'total_spent' => 15000,
                'last_visit_at' => now()->subDays(60),
                'is_active' => true,
            ],
            // 非アクティブ顧客
            [
                'name' => '小林 大介',
                'phone' => '090-9012-3456',
                'email' => 'kobayashi@example.com',
                'loyalty_rank' => 'regular',
                'total_bookings' => 35,
                'total_spent' => 120000,
                'last_visit_at' => now()->subDays(180),
                'is_active' => false,
            ],
            [
                'name' => '加藤 恵美',
                'phone' => '090-0123-4567',
                'email' => 'kato@example.com',
                'loyalty_rank' => 'new',
                'total_bookings' => 3,
                'total_spent' => 9000,
                'last_visit_at' => now()->subDays(365),
                'is_active' => false,
            ],
        ];

        foreach ($customers as $customerData) {
            Customer::create(array_merge($customerData, [
                'store_id' => $storeId,
                'line_user_id' => 'U' . Str::random(32), // ダミーのLINE ID
                'line_display_name' => $customerData['name'],
                'name_kana' => null,
                'birthday' => null,
                'gender' => null,
                'notes' => null,
                'allergies' => null,
                'preferences' => json_encode([]),
                'notification_settings' => json_encode([
                    'booking_confirmation' => true,
                    'booking_reminder' => true,
                    'marketing' => false,
                ]),
                'no_show_count' => 0,
                'is_restricted' => false,
                'first_visit_at' => $customerData['last_visit_at'] ?? now()->subDays(365),
            ]));
        }

        $this->command->info('顧客テストデータを作成しました: ' . count($customers) . '件');
    }
}
