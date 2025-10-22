<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Menu;
use App\Models\MenuOption;
use App\Models\Store;

/**
 * メニューテストデータSeeder
 * 
 * 美容室業界のサンプルメニューとオプションを作成
 * MenusPageのUI確認用
 */
class MenuSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // テスト店舗を取得
        $store = Store::where('name', 'テスト店舗')->first();
        
        if (!$store) {
            $this->command->warn('テスト店舗が見つかりません。先にStoreSeederを実行してください。');
            return;
        }

        $this->command->info('美容室メニューテストデータを作成中...');

        // カットメニュー
        $cutMenu = Menu::create([
            'store_id' => $store->id,
            'name' => 'cut',
            'display_name' => 'カット',
            'category' => 'カット',
            'description' => 'お客様の骨格や髪質に合わせたカットをご提供します。カウンセリングからスタイリングまで丁寧に仕上げます。',
            'base_price' => 4500,
            'base_duration' => 60,
            'prep_duration' => 5,
            'cleanup_duration' => 10,
            'advance_booking_hours' => 2,
            'gender_restriction' => 'none',
            'is_active' => true,
            'require_approval' => false,
            'sort_order' => 1,
        ]);

        // カットオプション
        MenuOption::create([
            'menu_id' => $cutMenu->id,
            'name' => 'shampoo_treatment',
            'display_name' => 'シャンプー・トリートメント',
            'description' => '高品質なシャンプーとトリートメントで髪に潤いを与えます',
            'option_type' => 'addon',
            'pricing_type' => 'fixed',
            'price' => 800,
            'duration' => 15,
            'is_required' => false,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        MenuOption::create([
            'menu_id' => $cutMenu->id,
            'name' => 'head_spa',
            'display_name' => 'ヘッドスパ',
            'description' => '頭皮マッサージでリラックス効果抜群',
            'option_type' => 'addon',
            'pricing_type' => 'fixed',
            'price' => 1500,
            'duration' => 20,
            'is_required' => false,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        // カラーメニュー
        $colorMenu = Menu::create([
            'store_id' => $store->id,
            'name' => 'color',
            'display_name' => 'カラー',
            'category' => 'カラー',
            'description' => '豊富なカラーバリエーションから、お客様に最適な色をご提案。髪へのダメージを最小限に抑えた施術を行います。',
            'base_price' => 6800,
            'base_duration' => 90,
            'prep_duration' => 10,
            'cleanup_duration' => 15,
            'advance_booking_hours' => 4,
            'gender_restriction' => 'none',
            'is_active' => true,
            'require_approval' => false,
            'sort_order' => 2,
        ]);

        // カラーオプション
        MenuOption::create([
            'menu_id' => $colorMenu->id,
            'name' => 'premium_color',
            'display_name' => 'プレミアムカラー',
            'description' => '最高級カラー剤使用、発色・持ちが格段に向上',
            'option_type' => 'upgrade',
            'pricing_type' => 'fixed',
            'price' => 2000,
            'duration' => 0,
            'is_required' => false,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        MenuOption::create([
            'menu_id' => $colorMenu->id,
            'name' => 'hair_treatment',
            'display_name' => 'ヘアトリートメント',
            'description' => 'カラー後の髪を保護・補修するトリートメント',
            'option_type' => 'addon',
            'pricing_type' => 'fixed',
            'price' => 1200,
            'duration' => 10,
            'is_required' => false,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        // パーマメニュー
        $permaMenu = Menu::create([
            'store_id' => $store->id,
            'name' => 'perm',
            'display_name' => 'パーマ',
            'category' => 'パーマ',
            'description' => 'デジタルパーマ、エアウェーブなど、お客様の髪質とご希望に合わせたパーマスタイルをご提案します。',
            'base_price' => 8500,
            'base_duration' => 120,
            'prep_duration' => 10,
            'cleanup_duration' => 20,
            'advance_booking_hours' => 6,
            'gender_restriction' => 'none',
            'is_active' => true,
            'require_approval' => false,
            'sort_order' => 3,
        ]);

        // パーマオプション
        MenuOption::create([
            'menu_id' => $permaMenu->id,
            'name' => 'digital_perm',
            'display_name' => 'デジタルパーマ',
            'description' => '形状記憶効果で長持ち、自然な仕上がり',
            'option_type' => 'upgrade',
            'pricing_type' => 'fixed',
            'price' => 1500,
            'duration' => 15,
            'is_required' => false,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        // ストレートメニュー
        $straightMenu = Menu::create([
            'store_id' => $store->id,
            'name' => 'straight',
            'display_name' => 'ストレート',
            'category' => 'ストレート',
            'description' => '縮毛矯正、ストレートパーマで理想のサラサラヘアに。髪質改善効果も期待できます。',
            'base_price' => 12000,
            'base_duration' => 180,
            'prep_duration' => 15,
            'cleanup_duration' => 25,
            'advance_booking_hours' => 12,
            'gender_restriction' => 'none',
            'is_active' => true,
            'require_approval' => true, // 高額メニューのため要承認
            'sort_order' => 4,
        ]);

        // ヘッドスパメニュー
        $spaMenu = Menu::create([
            'store_id' => $store->id,
            'name' => 'head_spa_course',
            'display_name' => 'ヘッドスパコース',
            'category' => 'スパ・ケア',
            'description' => '頭皮と髪の健康を考えた本格ヘッドスパ。リラクゼーション効果も抜群です。',
            'base_price' => 3500,
            'base_duration' => 45,
            'prep_duration' => 5,
            'cleanup_duration' => 10,
            'advance_booking_hours' => 1,
            'gender_restriction' => 'none',
            'is_active' => true,
            'require_approval' => false,
            'sort_order' => 5,
        ]);

        // スパオプション
        MenuOption::create([
            'menu_id' => $spaMenu->id,
            'name' => 'aroma_oil',
            'display_name' => 'アロマオイル',
            'description' => 'お好みの香りでリラックス効果をアップ',
            'option_type' => 'addon',
            'pricing_type' => 'fixed',
            'price' => 500,
            'duration' => 0,
            'is_required' => false,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        MenuOption::create([
            'menu_id' => $spaMenu->id,
            'name' => 'scalp_treatment',
            'display_name' => '頭皮トリートメント',
            'description' => '頭皮の状態を改善する専用トリートメント',
            'option_type' => 'addon',
            'pricing_type' => 'fixed',
            'price' => 800,
            'duration' => 10,
            'is_required' => false,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        // セットメニュー（非アクティブ例）
        Menu::create([
            'store_id' => $store->id,
            'name' => 'old_set_menu',
            'display_name' => '旧セットメニュー',
            'category' => 'セット',
            'description' => '廃止予定のセットメニューです。',
            'base_price' => 9800,
            'base_duration' => 150,
            'prep_duration' => 10,
            'cleanup_duration' => 15,
            'advance_booking_hours' => 1,
            'gender_restriction' => 'none',
            'is_active' => false, // 非アクティブ
            'require_approval' => false,
            'sort_order' => 99,
        ]);

        $this->command->info('メニューテストデータの作成が完了しました！');
        $this->command->line('作成されたメニュー:');
        $this->command->line('- カット (¥4,500, 60分)');
        $this->command->line('- カラー (¥6,800, 90分)');
        $this->command->line('- パーマ (¥8,500, 120分)');
        $this->command->line('- ストレート (¥12,000, 180分) ※要承認');
        $this->command->line('- ヘッドスパコース (¥3,500, 45分)');
        $this->command->line('- 旧セットメニュー (非アクティブ)');
        $this->command->line('');
        $this->command->info('各メニューには適切なオプションも追加されています。');
    }
} 