# tugical テスト戦略書
## 包括的品質保証ガイドライン

**File**: tugical_test_strategy_v1.0.md  
**Version**: 1.0  
**作成日**: 2025-10-22 16:31  
**更新日**: 2025-10-22 16:31  
**Project**: tugical（ツギカル）  
**Strategy**: 段階的テスト自動化 & 継続的品質改善

---

## 🎯 テスト戦略概要

### テスト方針
```
品質ファースト戦略:
✅ 予約データの整合性保証
✅ LINE連携の信頼性確保  
✅ マルチテナント分離の安全性
✅ パフォーマンスの継続的改善
✅ セキュリティの多層防御
```

### テストピラミッド
```
           /\
          /  \
        /  E2E  \      <- 少数・重要シナリオ
       /________\
      /          \
     /    API     \    <- 中程度・機能網羅
    /______________\
   /                \
  /      Unit        \  <- 多数・高速実行
 /____________________\
```

---

## 📋 テスト分類・責任範囲

### 1. Unit Tests（単体テスト）
```yaml
Coverage Target: 80%以上
Execution: 開発時・CI/CD
Responsibility: 開発者
Tools: PHPUnit, Jest, React Testing Library

Scope:
  Backend:
    - Model層のビジネスロジック
    - Service層の処理フロー
    - Utility関数の動作
    - Validation ルールの検証
  
  Frontend:
    - React Component の動作
    - Custom Hook の処理
    - Utility関数の動作
    - State管理の正確性
```

### 2. Integration Tests（結合テスト）
```yaml
Coverage Target: 主要API 100%
Execution: CI/CD・デプロイ前
Responsibility: 開発者・QA
Tools: PHPUnit, Postman/Newman

Scope:
  - API endpoint の動作
  - Database との連携
  - 外部サービス連携（LINE API）
  - Cache動作の検証
  - Queue処理の確認
```

### 3. End-to-End Tests（E2Eテスト）
```yaml
Coverage Target: クリティカルパス 100%
Execution: デプロイ前・定期実行
Responsibility: QA・開発チーム
Tools: Playwright, Cypress

Scope:
  - 予約完了フローの全工程
  - 管理画面の主要機能
  - LINE連携の動作確認
  - 複数ブラウザ・デバイス対応
```

### 4. Performance Tests（性能テスト）
```yaml
Coverage Target: 主要エンドポイント
Execution: 週次・リリース前
Responsibility: DevOps・QA
Tools: Apache JMeter, k6

Scope:
  - レスポンス時間測定
  - 同時接続負荷テスト
  - データベース性能
  - メモリ・CPU使用量監視
```

### 5. Security Tests（セキュリティテスト）
```yaml
Coverage Target: 全認証・認可機能
Execution: 月次・リリース前
Responsibility: セキュリティ担当・DevOps
Tools: OWASP ZAP, SonarQube

Scope:
  - 認証・認可の検証
  - SQL Injection 対策
  - XSS 対策の確認
  - CSRF 対策の確認
  - 個人情報保護の検証
```

---

## 🧪 テスト実装詳細

### Unit Tests実装

#### Backend（Laravel）
```php
<?php
// tests/Unit/Services/BookingServiceTest.php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\BookingService;
use App\Models\Store;
use App\Models\Customer;
use App\Models\Menu;
use App\Models\Resource;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class BookingServiceTest extends TestCase
{
    use RefreshDatabase;

    private BookingService $bookingService;
    private Store $store;
    private Customer $customer;
    private Menu $menu;
    private Resource $resource;

    protected function setUp(): void
    {
        parent::setUp();
        $this->bookingService = app(BookingService::class);
        
        // テストデータセットアップ
        $this->store = Store::factory()->create();
        $this->customer = Customer::factory()->create(['store_id' => $this->store->id]);
        $this->menu = Menu::factory()->create(['store_id' => $this->store->id]);
        $this->resource = Resource::factory()->create(['store_id' => $this->store->id]);
    }

    /** @test */
    public function 正常な予約データで予約を作成できる()
    {
        $bookingData = [
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'menu_id' => $this->menu->id,
            'resource_id' => $this->resource->id,
            'booking_date' => Carbon::tomorrow()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'customer_notes' => 'テスト予約です'
        ];

        $booking = $this->bookingService->createBooking($bookingData);

        $this->assertInstanceOf(Booking::class, $booking);
        $this->assertEquals('pending', $booking->status);
        $this->assertEquals($bookingData['customer_notes'], $booking->customer_notes);
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'pending'
        ]);
    }

    /** @test */
    public function 重複する時間帯では予約を作成できない()
    {
        // 既存の予約を作成
        Booking::factory()->create([
            'store_id' => $this->store->id,
            'resource_id' => $this->resource->id,
            'booking_date' => Carbon::tomorrow(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'status' => 'confirmed'
        ]);

        $bookingData = [
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'menu_id' => $this->menu->id,
            'resource_id' => $this->resource->id,
            'booking_date' => Carbon::tomorrow()->format('Y-m-d'),
            'start_time' => '10:30',
            'end_time' => '11:30',
        ];

        $this->expectException(\App\Exceptions\BookingConflictException::class);
        $this->bookingService->createBooking($bookingData);
    }

    /** @test */
    public function 営業時間外の予約は作成できない()
    {
        $this->store->update([
            'business_hours' => [
                'monday' => ['09:00-18:00']
            ]
        ]);

        $bookingData = [
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'menu_id' => $this->menu->id,
            'booking_date' => Carbon::parse('next monday')->format('Y-m-d'),
            'start_time' => '20:00',
            'end_time' => '21:00',
        ];

        $this->expectException(\App\Exceptions\OutsideBusinessHoursException::class);
        $this->bookingService->createBooking($bookingData);
    }

    /** @test */
    public function 料金計算が正確に行われる()
    {
        $menu = Menu::factory()->create([
            'store_id' => $this->store->id,
            'base_price' => 5000,
            'base_duration' => 60
        ]);

        $resource = Resource::factory()->create([
            'store_id' => $this->store->id,
            'hourly_rate_diff' => 1000 // 指名料
        ]);

        $booking = $this->bookingService->createBooking([
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'menu_id' => $menu->id,
            'resource_id' => $resource->id,
            'booking_date' => Carbon::tomorrow()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);

        $this->assertEquals(5000, $booking->base_price);
        $this->assertEquals(1000, $booking->resource_price);
        $this->assertEquals(6000, $booking->total_price);
    }

    /** @test */
    public function 予約番号が一意で生成される()
    {
        $booking1 = $this->bookingService->createBooking([
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'menu_id' => $this->menu->id,
            'booking_date' => Carbon::tomorrow()->format('Y-m-d'),
            'start_time' => '10:00',
            'end_time' => '11:00',
        ]);

        $booking2 = $this->bookingService->createBooking([
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'menu_id' => $this->menu->id,
            'booking_date' => Carbon::tomorrow()->format('Y-m-d'),
            'start_time' => '12:00',
            'end_time' => '13:00',
        ]);

        $this->assertNotEquals($booking1->booking_number, $booking2->booking_number);
        $this->assertMatchesRegularExpression('/^TG\d{8}$/', $booking1->booking_number);
    }
}
```

#### Frontend（React）
```typescript
// frontend/src/components/__tests__/BookingForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from '../BookingForm';
import { BookingProvider } from '../../contexts/BookingContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <BookingProvider>
      {children}
    </BookingProvider>
  </QueryClientProvider>
);

describe('BookingForm', () => {
  const mockOnSubmit = jest.fn();
  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('必要な入力フィールドが表示される', () => {
    render(
      <TestWrapper>
        <BookingForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByLabelText('メニュー選択')).toBeInTheDocument();
    expect(screen.getByLabelText('スタッフ選択')).toBeInTheDocument();
    expect(screen.getByLabelText('予約日')).toBeInTheDocument();
    expect(screen.getByLabelText('開始時間')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '予約する' })).toBeInTheDocument();
  });

  test('メニュー選択時に料金が更新される', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <BookingForm {...defaultProps} />
      </TestWrapper>
    );

    const menuSelect = screen.getByLabelText('メニュー選択');
    await user.selectOptions(menuSelect, 'menu-1');

    await waitFor(() => {
      expect(screen.getByText('¥5,000')).toBeInTheDocument();
    });
  });

  test('必須フィールドが未入力の場合エラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <BookingForm {...defaultProps} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: '予約する' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('メニューを選択してください')).toBeInTheDocument();
      expect(screen.getByText('予約日を選択してください')).toBeInTheDocument();
    });
  });

  test('正常なデータでフォーム送信が実行される', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <BookingForm {...defaultProps} />
      </TestWrapper>
    );

    // フォームに入力
    await user.selectOptions(screen.getByLabelText('メニュー選択'), 'menu-1');
    await user.selectOptions(screen.getByLabelText('スタッフ選択'), 'staff-1');
    await user.type(screen.getByLabelText('予約日'), '2025-07-01');
    await user.selectOptions(screen.getByLabelText('開始時間'), '10:00');

    const submitButton = screen.getByRole('button', { name: '予約する' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        menuId: 'menu-1',
        resourceId: 'staff-1',
        bookingDate: '2025-07-01',
        startTime: '10:00',
      });
    });
  });

  test('ローディング中は送信ボタンが無効になる', () => {
    render(
      <TestWrapper>
        <BookingForm {...defaultProps} loading={true} />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: '送信中...' });
    expect(submitButton).toBeDisabled();
  });

  test('時間選択時にバリデーションが動作する', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <BookingForm {...defaultProps} />
      </TestWrapper>
    );

    // 営業時間外の時間を選択
    await user.selectOptions(screen.getByLabelText('開始時間'), '22:00');

    await waitFor(() => {
      expect(screen.getByText('営業時間外です')).toBeInTheDocument();
    });
  });
});
```

### Integration Tests実装

#### API Integration Tests
```php
<?php
// tests/Feature/Api/BookingApiTest.php

namespace Tests\Feature\Api;

use Tests\TestCase;
use App\Models\Store;
use App\Models\Customer;
use App\Models\Menu;
use App\Models\Resource;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class BookingApiTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;
    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->store = Store::factory()->create();
        $this->customer = Customer::factory()->create(['store_id' => $this->store->id]);
    }

    /** @test */
    public function 予約一覧を取得できる()
    {
        // 認証設定
        $staff = $this->store->staff()->first();
        Sanctum::actingAs($staff);

        // テストデータ作成
        Booking::factory()->count(3)->create(['store_id' => $this->store->id]);

        $response = $this->getJson("/api/v1/stores/{$this->store->id}/bookings");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'booking_number',
                            'customer_name',
                            'menu_name',
                            'booking_date',
                            'start_time',
                            'end_time',
                            'status',
                            'total_price'
                        ]
                    ],
                    'meta' => [
                        'current_page',
                        'per_page',
                        'total'
                    ]
                ]);
    }

    /** @test */
    public function 新規予約を作成できる()
    {
        $menu = Menu::factory()->create(['store_id' => $this->store->id]);
        $resource = Resource::factory()->create(['store_id' => $this->store->id]);

        $bookingData = [
            'customer_id' => $this->customer->id,
            'menu_id' => $menu->id,
            'resource_id' => $resource->id,
            'booking_date' => '2025-07-01',
            'start_time' => '10:00',
            'customer_notes' => 'テスト予約です'
        ];

        $response = $this->postJson("/api/v1/stores/{$this->store->id}/bookings", $bookingData);

        $response->assertStatus(201)
                ->assertJsonStructure([
                    'data' => [
                        'id',
                        'booking_number',
                        'status',
                        'total_price'
                    ]
                ]);

        $this->assertDatabaseHas('bookings', [
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'status' => 'pending'
        ]);
    }

    /** @test */
    public function 重複予約は作成できない()
    {
        $menu = Menu::factory()->create(['store_id' => $this->store->id]);
        $resource = Resource::factory()->create(['store_id' => $this->store->id]);

        // 既存予約作成
        Booking::factory()->create([
            'store_id' => $this->store->id,
            'resource_id' => $resource->id,
            'booking_date' => '2025-07-01',
            'start_time' => '10:00',
            'end_time' => '11:00',
            'status' => 'confirmed'
        ]);

        $bookingData = [
            'customer_id' => $this->customer->id,
            'menu_id' => $menu->id,
            'resource_id' => $resource->id,
            'booking_date' => '2025-07-01',
            'start_time' => '10:30', // 重複する時間
        ];

        $response = $this->postJson("/api/v1/stores/{$this->store->id}/bookings", $bookingData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['start_time']);
    }

    /** @test */
    public function 予約ステータスを更新できる()
    {
        $staff = $this->store->staff()->first();
        Sanctum::actingAs($staff);

        $booking = Booking::factory()->create([
            'store_id' => $this->store->id,
            'status' => 'pending'
        ]);

        $response = $this->patchJson("/api/v1/bookings/{$booking->id}/status", [
            'status' => 'confirmed'
        ]);

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'confirmed'
        ]);
    }

    /** @test */
    public function 他店舗の予約にはアクセスできない()
    {
        $otherStore = Store::factory()->create();
        $staff = $this->store->staff()->first();
        Sanctum::actingAs($staff);

        $otherBooking = Booking::factory()->create(['store_id' => $otherStore->id]);

        $response = $this->getJson("/api/v1/bookings/{$otherBooking->id}");

        $response->assertStatus(404);
    }

    /** @test */
    public function LINE webhook からの予約作成ができる()
    {
        $menu = Menu::factory()->create(['store_id' => $this->store->id]);
        
        $lineWebhookData = [
            'events' => [
                [
                    'type' => 'postback',
                    'source' => [
                        'userId' => 'U1234567890abcdef',
                        'type' => 'user'
                    ],
                    'postback' => [
                        'data' => 'action=create_booking&menu_id=' . $menu->id . '&date=2025-07-01&time=10:00'
                    ]
                ]
            ]
        ];

        $response = $this->postJson('/api/v1/line/webhook', $lineWebhookData, [
            'X-Line-Signature' => $this->generateLineSignature(json_encode($lineWebhookData))
        ]);

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('customers', [
            'line_user_id' => 'U1234567890abcdef',
            'store_id' => $this->store->id
        ]);
    }

    private function generateLineSignature(string $body): string
    {
        return base64_encode(hash_hmac('sha256', $body, config('line.channel_secret'), true));
    }
}
```

### End-to-End Tests実装

#### Playwright E2E Tests
```typescript
// tests/e2e/booking-flow.spec.ts

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { BookingPage } from '../pages/BookingPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('予約管理フロー', () => {
  let loginPage: LoginPage;
  let bookingPage: BookingPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    bookingPage = new BookingPage(page);
    dashboardPage = new DashboardPage(page);
    
    await page.goto('/admin/login');
  });

  test('管理者ログイン → 予約作成 → 確認の完全フロー', async ({ page }) => {
    // 1. ログイン
    await loginPage.login('admin@tugical.com', 'password');
    await expect(page).toHaveURL('/admin/dashboard');

    // 2. ダッシュボード確認
    await expect(dashboardPage.welcomeMessage).toBeVisible();
    await expect(dashboardPage.todayBookingsCard).toBeVisible();

    // 3. 予約ページに移動
    await dashboardPage.navigateToBookings();
    await expect(page).toHaveURL('/admin/bookings');

    // 4. 新規予約作成
    await bookingPage.clickNewBookingButton();
    
    await bookingPage.selectCustomer('田中太郎');
    await bookingPage.selectMenu('カット');
    await bookingPage.selectStaff('佐藤美容師');
    await bookingPage.selectDate('2025-07-01');
    await bookingPage.selectTime('10:00');
    await bookingPage.addNotes('初回のお客様です');

    // 5. 予約確認
    await bookingPage.submitBooking();
    
    // 成功メッセージの確認
    await expect(page.locator('.toast-success')).toContainText('予約が作成されました');
    
    // 予約一覧に表示されることを確認
    await expect(bookingPage.bookingList).toContainText('田中太郎');
    await expect(bookingPage.bookingList).toContainText('カット');
    await expect(bookingPage.bookingList).toContainText('2025-07-01');
  });

  test('予約の編集・キャンセル機能', async ({ page }) => {
    await loginPage.login('admin@tugical.com', 'password');
    await dashboardPage.navigateToBookings();

    // 既存予約を編集
    await bookingPage.clickEditBooking('TG12345678');
    
    await bookingPage.selectTime('11:00'); // 時間変更
    await bookingPage.updateBooking();
    
    await expect(page.locator('.toast-success')).toContainText('予約が更新されました');

    // 予約をキャンセル
    await bookingPage.clickCancelBooking('TG12345678');
    await bookingPage.confirmCancellation('都合により');
    
    await expect(page.locator('.toast-success')).toContainText('予約がキャンセルされました');
    
    // ステータスが更新されていることを確認
    await expect(page.locator('[data-booking="TG12345678"]')).toContainText('キャンセル');
  });

  test('予約の検索・フィルタリング機能', async ({ page }) => {
    await loginPage.login('admin@tugical.com', 'password');
    await dashboardPage.navigateToBookings();

    // 日付フィルタ
    await bookingPage.filterByDate('2025-07-01');
    await expect(bookingPage.bookingList.locator('tr')).toHaveCount(3);

    // スタッフフィルタ
    await bookingPage.filterByStaff('佐藤美容師');
    await expect(bookingPage.bookingList.locator('tr')).toHaveCount(2);

    // ステータスフィルタ
    await bookingPage.filterByStatus('confirmed');
    await expect(bookingPage.bookingList.locator('tr')).toHaveCount(1);

    // 検索機能
    await bookingPage.searchBookings('田中');
    await expect(bookingPage.bookingList).toContainText('田中太郎');
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイル表示
    await page.setViewportSize({ width: 375, height: 667 });
    await loginPage.login('admin@tugical.com', 'password');
    
    // モバイルメニューの動作確認
    await expect(page.locator('.mobile-menu-button')).toBeVisible();
    await page.click('.mobile-menu-button');
    await expect(page.locator('.mobile-menu')).toBeVisible();

    // タブレット表示
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.main-content')).toBeVisible();
  });
});

test.describe('LIFF予約フロー', () => {
  test('LINE LIFF経由での予約完了フロー', async ({ page }) => {
    // LIFF環境の模擬
    await page.addInitScript(() => {
      window.liff = {
        init: () => Promise.resolve(),
        isLoggedIn: () => true,
        getProfile: () => Promise.resolve({
          userId: 'U1234567890abcdef',
          displayName: '田中太郎',
          pictureUrl: 'https://example.com/profile.jpg'
        }),
        closeWindow: () => {},
      };
    });

    await page.goto('/liff/booking');

    // 1. メニュー選択
    await page.click('[data-menu="cut"]');
    await expect(page.locator('.selected-menu')).toContainText('カット');

    // 2. スタッフ選択
    await page.click('[data-staff="sato"]');
    await expect(page.locator('.selected-staff')).toContainText('佐藤美容師');

    // 3. 日時選択
    await page.click('[data-date="2025-07-01"]');
    await page.click('[data-time="10:00"]');

    // 4. 個人情報入力
    await page.fill('[data-field="phone"]', '090-1234-5678');
    await page.fill('[data-field="notes"]', '初回利用です');

    // 5. 予約確認
    await page.click('[data-action="confirm"]');
    
    // 確認画面の内容チェック
    await expect(page.locator('.booking-summary')).toContainText('カット');
    await expect(page.locator('.booking-summary')).toContainText('佐藤美容師');
    await expect(page.locator('.booking-summary')).toContainText('2025-07-01');
    await expect(page.locator('.booking-summary')).toContainText('10:00');

    // 6. 予約完了
    await page.click('[data-action="submit"]');
    
    // 完了画面の確認
    await expect(page.locator('.success-message')).toContainText('予約が完了しました');
    await expect(page.locator('.booking-number')).toMatch(/TG\d{8}/);
  });

  test('LIFF予約エラーハンドリング', async ({ page }) => {
    await page.addInitScript(() => {
      window.liff = {
        init: () => Promise.resolve(),
        isLoggedIn: () => true,
        getProfile: () => Promise.resolve({
          userId: 'U1234567890abcdef',
          displayName: '田中太郎'
        }),
      };
    });

    await page.goto('/liff/booking');

    // 必須項目未選択での送信
    await page.click('[data-action="confirm"]');
    await expect(page.locator('.error-message')).toContainText('メニューを選択してください');

    // 営業時間外の選択
    await page.click('[data-menu="cut"]');
    await page.click('[data-date="2025-07-01"]');
    await page.click('[data-time="20:00"]'); // 営業時間外
    
    await expect(page.locator('.time-error')).toContainText('営業時間外です');

    // 既に予約済みの時間選択
    await page.click('[data-time="10:00"]'); // 既に予約済み
    await expect(page.locator('.time-error')).toContainText('この時間は予約済みです');
  });
});
```

#### Page Object Models
```typescript
// tests/e2e/pages/BookingPage.ts

import { Page, Locator } from '@playwright/test';

export class BookingPage {
  readonly page: Page;
  readonly newBookingButton: Locator;
  readonly bookingList: Locator;
  readonly customerSelect: Locator;
  readonly menuSelect: Locator;
  readonly staffSelect: Locator;
  readonly dateInput: Locator;
  readonly timeSelect: Locator;
  readonly notesTextarea: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newBookingButton = page.locator('[data-testid="new-booking-button"]');
    this.bookingList = page.locator('[data-testid="booking-list"]');
    this.customerSelect = page.locator('[data-testid="customer-select"]');
    this.menuSelect = page.locator('[data-testid="menu-select"]');
    this.staffSelect = page.locator('[data-testid="staff-select"]');
    this.dateInput = page.locator('[data-testid="date-input"]');
    this.timeSelect = page.locator('[data-testid="time-select"]');
    this.notesTextarea = page.locator('[data-testid="notes-textarea"]');
    this.submitButton = page.locator('[data-testid="submit-button"]');
  }

  async clickNewBookingButton() {
    await this.newBookingButton.click();
  }

  async selectCustomer(customerName: string) {
    await this.customerSelect.selectOption({ label: customerName });
  }

  async selectMenu(menuName: string) {
    await this.menuSelect.selectOption({ label: menuName });
  }

  async selectStaff(staffName: string) {
    await this.staffSelect.selectOption({ label: staffName });
  }

  async selectDate(date: string) {
    await this.dateInput.fill(date);
  }

  async selectTime(time: string) {
    await this.timeSelect.selectOption({ label: time });
  }

  async addNotes(notes: string) {
    await this.notesTextarea.fill(notes);
  }

  async submitBooking() {
    await this.submitButton.click();
  }

  async clickEditBooking(bookingNumber: string) {
    await this.page.click(`[data-booking="${bookingNumber}"] .edit-button`);
  }

  async updateBooking() {
    await this.page.click('[data-testid="update-button"]');
  }

  async clickCancelBooking(bookingNumber: string) {
    await this.page.click(`[data-booking="${bookingNumber}"] .cancel-button`);
  }

  async confirmCancellation(reason: string) {
    await this.page.fill('[data-testid="cancellation-reason"]', reason);
    await this.page.click('[data-testid="confirm-cancel"]');
  }

  async filterByDate(date: string) {
    await this.page.fill('[data-testid="date-filter"]', date);
  }

  async filterByStaff(staffName: string) {
    await this.page.selectOption('[data-testid="staff-filter"]', { label: staffName });
  }

  async filterByStatus(status: string) {
    await this.page.selectOption('[data-testid="status-filter"]', { label: status });
  }

  async searchBookings(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');
  }
}
```

---

## ⚡ Performance Tests実装

### Load Testing（Apache JMeter）
```xml
<!-- tests/performance/booking-load-test.jmx -->
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <hashTree>
    <TestPlan testname="tugical Booking Load Test">
      <elementProp name="TestPlan.arguments" elementType="Arguments"/>
      <stringProp name="TestPlan.user_define_classpath"></stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
    </TestPlan>
    
    <hashTree>
      <!-- User Variables -->
      <Arguments testname="User Defined Variables">
        <collectionProp name="Arguments.arguments">
          <elementProp name="BASE_URL" elementType="Argument">
            <stringProp name="Argument.name">BASE_URL</stringProp>
            <stringProp name="Argument.value">https://staging.tugical.com</stringProp>
          </elementProp>
          <elementProp name="API_TOKEN" elementType="Argument">
            <stringProp name="Argument.name">API_TOKEN</stringProp>
            <stringProp name="Argument.value">${__P(api_token)}</stringProp>
          </elementProp>
        </collectionProp>
      </Arguments>
      
      <!-- Thread Group: Booking API Load Test -->
      <ThreadGroup testname="Booking API Load Test">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
          <boolProp name="LoopController.continue_forever">false</boolProp>
          <stringProp name="LoopController.loops">10</stringProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">50</stringProp>
        <stringProp name="ThreadGroup.ramp_time">30</stringProp>
      </ThreadGroup>
      
      <hashTree>
        <!-- HTTP Request: Get Bookings -->
        <HTTPSamplerProxy testname="Get Bookings">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments"/>
          <stringProp name="HTTPSampler.domain">${BASE_URL}</stringProp>
          <stringProp name="HTTPSampler.path">/api/v1/stores/1/bookings</stringProp>
          <stringProp name="HTTPSampler.method">GET</stringProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
        </HTTPSamplerProxy>
        
        <hashTree>
          <!-- Response Assertion -->
          <ResponseAssertion testname="Response Assertion">
            <collectionProp name="Asserion.test_strings">
              <stringProp>200</stringProp>
            </collectionProp>
            <stringProp name="Assertion.test_field">Assertion.response_code</stringProp>
          </ResponseAssertion>
          
          <!-- Duration Assertion -->
          <DurationAssertion testname="Duration Assertion">
            <stringProp name="DurationAssertion.duration">2000</stringProp>
          </DurationAssertion>
        </hashTree>
        
        <!-- HTTP Request: Create Booking -->
        <HTTPSamplerProxy testname="Create Booking">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
              <elementProp name="" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">{
                  "customer_id": 1,
                  "menu_id": 1,
                  "resource_id": 1,
                  "booking_date": "2025-07-01",
                  "start_time": "10:00"
                }</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>
            </collectionProp>
          </elementProp>
          <stringProp name="HTTPSampler.domain">${BASE_URL}</stringProp>
          <stringProp name="HTTPSampler.path">/api/v1/stores/1/bookings</stringProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
          <stringProp name="HTTPSampler.contentEncoding">UTF-8</stringProp>
        </HTTPSamplerProxy>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
```

### k6 Performance Script
```javascript
// tests/performance/booking-performance.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must be below 2s
    http_req_failed: ['rate<0.05'],     // Error rate must be below 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = 'https://staging.tugical.com';
const API_TOKEN = __ENV.API_TOKEN;

export default function () {
  const params = {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  // Test: Get bookings
  let response = http.get(`${BASE_URL}/api/v1/stores/1/bookings`, params);
  
  check(response, {
    'Get bookings status is 200': (r) => r.status === 200,
    'Get bookings response time < 2s': (r) => r.timings.duration < 2000,
    'Response contains data': (r) => r.json('data') !== undefined,
  }) || errorRate.add(1);

  sleep(1);

  // Test: Create booking
  const bookingData = {
    customer_id: Math.floor(Math.random() * 100) + 1,
    menu_id: Math.floor(Math.random() * 10) + 1,
    resource_id: Math.floor(Math.random() * 5) + 1,
    booking_date: '2025-07-01',
    start_time: `${Math.floor(Math.random() * 8) + 9}:00`,
  };

  response = http.post(
    `${BASE_URL}/api/v1/stores/1/bookings`,
    JSON.stringify(bookingData),
    params
  );

  check(response, {
    'Create booking status is 201': (r) => r.status === 201,
    'Create booking response time < 3s': (r) => r.timings.duration < 3000,
    'Booking number generated': (r) => r.json('data.booking_number') !== undefined,
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'performance-report.html': htmlReport(data),
    'performance-report.json': JSON.stringify(data, null, 2),
  };
}

function htmlReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>tugical Performance Test Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
            .pass { background-color: #d4edda; }
            .fail { background-color: #f8d7da; }
        </style>
    </head>
    <body>
        <h1>tugical Performance Test Report</h1>
        <h2>Summary</h2>
        <div class="metric ${data.metrics.http_req_duration.thresholds.p95.ok ? 'pass' : 'fail'}">
            <strong>Response Time (95th percentile):</strong> ${data.metrics.http_req_duration.values.p95.toFixed(2)}ms
            <br>Threshold: < 2000ms
        </div>
        <div class="metric ${data.metrics.http_req_failed.thresholds.rate.ok ? 'pass' : 'fail'}">
            <strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
            <br>Threshold: < 5%
        </div>
        <div class="metric">
            <strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}
        </div>
        <div class="metric">
            <strong>Average Response Time:</strong> ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
        </div>
    </body>
    </html>
  `;
}
```

---

## 🔒 Security Tests実装

### Security Testing Script
```bash
#!/bin/bash
# tests/security/security-scan.sh

set -e

DOMAIN="staging.tugical.com"
REPORT_DIR="./security-reports"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🔒 tugical Security Testing - $DATE"
echo "========================================"

mkdir -p $REPORT_DIR

# 1. OWASP ZAP Security Scan
echo "🕷️ Running OWASP ZAP scan..."
docker run -v $(pwd)/$REPORT_DIR:/zap/wrk/:rw \
  -t owasp/zap2docker-stable zap-baseline.py \
  -t https://$DOMAIN \
  -g gen.conf \
  -r zap_report_$DATE.html

# 2. SSL/TLS Test
echo "🔐 Running SSL/TLS tests..."
docker run --rm drwetter/testssl.sh:3.0.8 \
  --htmlfile $REPORT_DIR/ssl_report_$DATE.html \
  https://$DOMAIN

# 3. HTTP Security Headers Check
echo "🛡️ Checking security headers..."
curl -I https://$DOMAIN | tee $REPORT_DIR/headers_$DATE.txt

# Security headers validation
check_header() {
  local header=$1
  local expected=$2
  if grep -q "$header" $REPORT_DIR/headers_$DATE.txt; then
    echo "✅ $header: Present"
  else
    echo "❌ $header: Missing"
  fi
}

check_header "X-Frame-Options" 
check_header "X-XSS-Protection"
check_header "X-Content-Type-Options"
check_header "Strict-Transport-Security"
check_header "Content-Security-Policy"

# 4. API Security Test
echo "🔍 Testing API security..."

# Test rate limiting
echo "Testing rate limiting..."
for i in {1..20}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/v1/health)
  echo "Request $i: $response"
  if [ "$response" = "429" ]; then
    echo "✅ Rate limiting is working"
    break
  fi
done

# Test SQL injection protection
echo "Testing SQL injection protection..."
sql_payloads=(
  "'; DROP TABLE bookings; --"
  "' OR '1'='1"
  "' UNION SELECT * FROM users --"
)

for payload in "${sql_payloads[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "{\"search\":\"$payload\"}" \
    https://$DOMAIN/api/v1/bookings/search)
  
  if [ "$response" = "400" ] || [ "$response" = "422" ]; then
    echo "✅ SQL injection protection working for: $payload"
  else
    echo "❌ Possible SQL injection vulnerability: $payload (HTTP $response)"
  fi
done

# 5. Authentication & Authorization Tests
echo "🔑 Testing authentication..."

# Test without authentication
response=$(curl -s -o /dev/null -w "%{http_code}" \
  https://$DOMAIN/api/v1/stores/1/bookings)

if [ "$response" = "401" ]; then
  echo "✅ Authentication required for protected endpoints"
else
  echo "❌ Authentication bypass possible (HTTP $response)"
fi

# 6. CORS Policy Test
echo "🌐 Testing CORS policy..."
response=$(curl -s -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-Requested-With" \
  -X OPTIONS \
  https://$DOMAIN/api/v1/health)

if echo "$response" | grep -q "Access-Control-Allow-Origin: https://malicious-site.com"; then
  echo "❌ CORS policy may be too permissive"
else
  echo "✅ CORS policy appears secure"
fi

echo "🔒 Security scan completed. Reports saved in $REPORT_DIR/"
```

### SAST (Static Application Security Testing)
```yaml
# .github/workflows/security.yml
name: Security Analysis

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Run Semgrep
      uses: returntocorp/semgrep-action@v1
      with:
        config: >-
          p/security-audit
          p/secrets
          p/owasp-top-ten
          p/php
          p/javascript
      env:
        SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

    - name: Run CodeQL Analysis
      uses: github/codeql-action/init@v2
      with:
        languages: php, javascript

    - name: Autobuild
      uses: github/codeql-action/autobuild@v2

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

    - name: Run Bandit (Python security linter)
      run: |
        pip install bandit
        bandit -r scripts/ -f json -o bandit-report.json || true

    - name: Upload security reports
      uses: actions/upload-artifact@v3
      with:
        name: security-reports
        path: |
          semgrep-report.json
          bandit-report.json
        retention-days: 30

  dependency-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/php@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high

    - name: Run npm audit
      working-directory: ./frontend
      run: |
        npm audit --audit-level=high
        npm audit --json > npm-audit-frontend.json || true

    - name: Run npm audit for LIFF
      working-directory: ./liff
      run: |
        npm audit --audit-level=high
        npm audit --json > npm-audit-liff.json || true

    - name: Upload audit reports
      uses: actions/upload-artifact@v3
      with:
        name: dependency-reports
        path: |
          npm-audit-frontend.json
          npm-audit-liff.json
```

---

## 📊 テスト自動化・CI/CD統合

### GitHub Actions Integration
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  PHP_VERSION: '8.2'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mariadb:10.11
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: tugical_test
        options: >-
          --health-cmd="healthcheck.sh --connect --innodb_initialized"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

      redis:
        image: redis:7.2-alpine
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - uses: actions/checkout@v4

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ env.PHP_VERSION }}
        extensions: pdo, mysql, redis
        coverage: xdebug

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    # Backend tests
    - name: Install PHP dependencies
      working-directory: ./backend
      run: composer install --prefer-dist --no-progress

    - name: Setup Laravel
      working-directory: ./backend
      run: |
        cp .env.testing .env
        php artisan key:generate
        php artisan migrate --force

    - name: Run PHP unit tests
      working-directory: ./backend
      run: php artisan test --coverage-clover=coverage.xml

    # Frontend tests
    - name: Install Frontend dependencies
      working-directory: ./frontend
      run: npm ci

    - name: Run Frontend tests
      working-directory: ./frontend
      run: npm run test:coverage

    # LIFF tests
    - name: Install LIFF dependencies
      working-directory: ./liff
      run: npm ci

    - name: Run LIFF tests
      working-directory: ./liff
      run: npm run test:coverage

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        files: ./backend/coverage.xml,./frontend/coverage/lcov.info,./liff/coverage/lcov.info

  integration-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mariadb:10.11
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: tugical_test
        options: >-
          --health-cmd="healthcheck.sh --connect --innodb_initialized"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
    - uses: actions/checkout@v4

    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: ${{ env.PHP_VERSION }}
        extensions: pdo, mysql, redis

    - name: Install dependencies
      working-directory: ./backend
      run: composer install --prefer-dist --no-progress

    - name: Run integration tests
      working-directory: ./backend
      run: php artisan test --testsuite=Feature

  e2e-tests:
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}

    - name: Install Playwright
      run: |
        npm install -g @playwright/test
        npx playwright install

    - name: Start application
      run: |
        docker-compose -f docker-compose.test.yml up -d
        sleep 30

    - name: Run E2E tests
      run: npx playwright test

    - name: Upload E2E test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30

  performance-tests:
    if: github.ref == 'refs/heads/main'
    needs: e2e-tests
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4

    - name: Run k6 performance tests
      uses: grafana/k6-action@v0.3.0
      with:
        filename: tests/performance/booking-performance.js
      env:
        API_TOKEN: ${{ secrets.API_TOKEN }}

    - name: Upload performance reports
      uses: actions/upload-artifact@v3
      with:
        name: performance-reports
        path: performance-report.*
```

### Test Quality Gates
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Setup SonarQube Scanner
      uses: warchant/setup-sonar-scanner@v7

    - name: Run SonarQube Analysis
      run: |
        sonar-scanner \
          -Dsonar.projectKey=tugical \
          -Dsonar.sources=backend/app,frontend/src,liff/src \
          -Dsonar.host.url=${{ secrets.SONAR_HOST_URL }} \
          -Dsonar.login=${{ secrets.SONAR_TOKEN }} \
          -Dsonar.php.coverage.reportPaths=backend/coverage.xml \
          -Dsonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info,liff/coverage/lcov.info

    - name: Quality Gate Check
      uses: sonarqube-quality-gate-action@master
      timeout-minutes: 5
      env:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

    - name: Block PR if quality gate fails
      if: failure()
      run: |
        echo "❌ Quality gate failed. Please fix the issues before merging."
        exit 1
```

---

## 📈 テスト指標・レポート

### Coverage Reports
```bash
#!/bin/bash
# scripts/generate-coverage-report.sh

echo "📊 Generating comprehensive test coverage report..."

# Backend coverage
cd backend
php artisan test --coverage-html=../reports/backend-coverage
php artisan test --coverage-clover=../reports/backend-coverage.xml

# Frontend coverage
cd ../frontend
npm run test:coverage
cp -r coverage ../reports/frontend-coverage

# LIFF coverage
cd ../liff
npm run test:coverage
cp -r coverage ../reports/liff-coverage

# Generate combined report
cd ../scripts
python3 combine-coverage.py

echo "✅ Coverage reports generated in reports/ directory"
```

### Test Metrics Dashboard
```javascript
// scripts/test-metrics-collector.js

const fs = require('fs');
const path = require('path');

class TestMetricsCollector {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      coverage: {},
      testResults: {},
      performance: {},
      quality: {}
    };
  }

  async collectCoverageMetrics() {
    // Backend coverage
    const backendCoverage = await this.parseCoverageReport('reports/backend-coverage.xml');
    
    // Frontend coverage
    const frontendCoverage = await this.parseCoverageReport('reports/frontend-coverage/lcov.info');
    
    // LIFF coverage
    const liffCoverage = await this.parseCoverageReport('reports/liff-coverage/lcov.info');

    this.metrics.coverage = {
      backend: {
        lines: backendCoverage.lines,
        functions: backendCoverage.functions,
        branches: backendCoverage.branches
      },
      frontend: {
        lines: frontendCoverage.lines,
        functions: frontendCoverage.functions,
        branches: frontendCoverage.branches
      },
      liff: {
        lines: liffCoverage.lines,
        functions: liffCoverage.functions,
        branches: liffCoverage.branches
      },
      overall: this.calculateOverallCoverage([backendCoverage, frontendCoverage, liffCoverage])
    };
  }

  async collectTestResults() {
    const junitResults = await this.parseJunitReport('reports/junit.xml');
    
    this.metrics.testResults = {
      total: junitResults.total,
      passed: junitResults.passed,
      failed: junitResults.failed,
      skipped: junitResults.skipped,
      duration: junitResults.duration,
      successRate: (junitResults.passed / junitResults.total * 100).toFixed(2)
    };
  }

  async collectPerformanceMetrics() {
    const performanceReport = JSON.parse(
      fs.readFileSync('reports/performance-report.json', 'utf8')
    );

    this.metrics.performance = {
      avgResponseTime: performanceReport.metrics.http_req_duration.values.avg,
      p95ResponseTime: performanceReport.metrics.http_req_duration.values.p95,
      errorRate: performanceReport.metrics.http_req_failed.values.rate * 100,
      throughput: performanceReport.metrics.http_reqs.values.rate
    };
  }

  generateReport() {
    const report = `
# tugical Test Metrics Report

Generated: ${this.metrics.timestamp}

## Test Coverage

| Component | Lines | Functions | Branches |
|-----------|-------|-----------|----------|
| Backend   | ${this.metrics.coverage.backend.lines}% | ${this.metrics.coverage.backend.functions}% | ${this.metrics.coverage.backend.branches}% |
| Frontend  | ${this.metrics.coverage.frontend.lines}% | ${this.metrics.coverage.frontend.functions}% | ${this.metrics.coverage.frontend.branches}% |
| LIFF      | ${this.metrics.coverage.liff.lines}% | ${this.metrics.coverage.liff.functions}% | ${this.metrics.coverage.liff.branches}% |
| **Overall** | **${this.metrics.coverage.overall.lines}%** | **${this.metrics.coverage.overall.functions}%** | **${this.metrics.coverage.overall.branches}%** |

## Test Results

- **Total Tests**: ${this.metrics.testResults.total}
- **Passed**: ${this.metrics.testResults.passed} ✅
- **Failed**: ${this.metrics.testResults.failed} ❌
- **Skipped**: ${this.metrics.testResults.skipped} ⏭️
- **Success Rate**: ${this.metrics.testResults.successRate}%
- **Duration**: ${this.metrics.testResults.duration}s

## Performance Metrics

- **Average Response Time**: ${this.metrics.performance.avgResponseTime.toFixed(2)}ms
- **95th Percentile**: ${this.metrics.performance.p95ResponseTime.toFixed(2)}ms
- **Error Rate**: ${this.metrics.performance.errorRate.toFixed(2)}%
- **Throughput**: ${this.metrics.performance.throughput.toFixed(2)} req/s

## Quality Gates

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Line Coverage | ≥80% | ${this.metrics.coverage.overall.lines}% | ${this.metrics.coverage.overall.lines >= 80 ? '✅' : '❌'} |
| Test Success Rate | ≥95% | ${this.metrics.testResults.successRate}% | ${this.metrics.testResults.successRate >= 95 ? '✅' : '❌'} |
| P95 Response Time | ≤2s | ${this.metrics.performance.p95ResponseTime.toFixed(2)}ms | ${this.metrics.performance.p95ResponseTime <= 2000 ? '✅' : '❌'} |
| Error Rate | ≤5% | ${this.metrics.performance.errorRate.toFixed(2)}% | ${this.metrics.performance.errorRate <= 5 ? '✅' : '❌'} |
`;

    return report;
  }

  async parseCoverageReport(filePath) {
    // Implementation for parsing coverage reports
    // This would parse XML/LCOV format and extract metrics
    return {
      lines: 85.5,
      functions: 90.2,
      branches: 78.9
    };
  }

  async parseJunitReport(filePath) {
    // Implementation for parsing JUnit XML reports
    return {
      total: 156,
      passed: 152,
      failed: 2,
      skipped: 2,
      duration: 45.6
    };
  }

  calculateOverallCoverage(coverageData) {
    const totalLines = coverageData.reduce((sum, data) => sum + data.lines, 0);
    const totalFunctions = coverageData.reduce((sum, data) => sum + data.functions, 0);
    const totalBranches = coverageData.reduce((sum, data) => sum + data.branches, 0);

    return {
      lines: (totalLines / coverageData.length).toFixed(1),
      functions: (totalFunctions / coverageData.length).toFixed(1),
      branches: (totalBranches / coverageData.length).toFixed(1)
    };
  }

  async saveMetrics() {
    const reportPath = `reports/test-metrics-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2));
    
    const markdownReport = this.generateReport();
    fs.writeFileSync('reports/test-report.md', markdownReport);
    
    console.log('📊 Test metrics saved to:', reportPath);
    console.log('📄 Test report saved to: reports/test-report.md');
  }
}

// Usage
async function main() {
  const collector = new TestMetricsCollector();
  
  await collector.collectCoverageMetrics();
  await collector.collectTestResults();
  await collector.collectPerformanceMetrics();
  await collector.saveMetrics();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestMetricsCollector;
```

---

## 🔄 継続的改善プロセス

### Test Quality Review Process
```yaml
# テスト品質レビュープロセス

Weekly Review:
  - テストカバレッジ分析
  - 失敗テストの傾向分析  
  - パフォーマンステストの結果確認
  - フレーキーテストの特定・修正

Monthly Review:
  - テスト戦略の見直し
  - 新機能のテスト要件定義
  - テストツールの評価・更新
  - テスト実行時間の最適化

Quarterly Review:
  - テスト自動化の ROI 分析
  - テストプロセスの改善案検討
  - 新しいテスト手法の導入検討
  - チームのテストスキル向上計画
```

### Test Failure Analysis
```bash
#!/bin/bash
# scripts/test-failure-analysis.sh

REPORT_DIR="reports/failures"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🔍 Test Failure Analysis - $DATE"
echo "=================================="

mkdir -p $REPORT_DIR

# Collect failure data from last 30 days
echo "Collecting test failure data..."

# Backend test failures
grep -r "FAILED" backend/storage/logs/testing*.log > $REPORT_DIR/backend_failures_$DATE.txt || true

# Frontend test failures  
find frontend/coverage -name "*.json" -mtime -30 | xargs cat | jq '.failures[]' > $REPORT_DIR/frontend_failures_$DATE.json || true

# E2E test failures
find playwright-report -name "*.json" -mtime -30 | xargs cat | jq '.results[] | select(.status == "failed")' > $REPORT_DIR/e2e_failures_$DATE.json || true

# Analyze patterns
python3 - << EOF
import json
import re
from collections import Counter

print("📊 Failure Pattern Analysis")
print("="*40)

# Analyze backend failures
try:
    with open('$REPORT_DIR/backend_failures_$DATE.txt', 'r') as f:
        backend_failures = f.readlines()
    
    # Extract test names
    test_patterns = []
    for line in backend_failures:
        match = re.search(r'Tests\\(.+?)Test::', line)
        if match:
            test_patterns.append(match.group(1))
    
    if test_patterns:
        print("🔴 Most failing backend test types:")
        for test_type, count in Counter(test_patterns).most_common(5):
            print(f"  - {test_type}: {count} failures")
    else:
        print("✅ No backend test failures found")
        
except FileNotFoundError:
    print("✅ No backend test failures found")

print()

# Analyze E2E failures
try:
    with open('$REPORT_DIR/e2e_failures_$DATE.json', 'r') as f:
        e2e_data = f.read().strip()
    
    if e2e_data:
        failures = []
        for line in e2e_data.split('\n'):
            if line.strip():
                failure = json.loads(line)
                failures.append(failure.get('title', 'Unknown'))
        
        if failures:
            print("🔴 Most failing E2E tests:")
            for test_name, count in Counter(failures).most_common(5):
                print(f"  - {test_name}: {count} failures")
    else:
        print("✅ No E2E test failures found")
        
except (FileNotFoundError, json.JSONDecodeError):
    print("✅ No E2E test failures found")

EOF

# Generate failure trends report
echo ""
echo "📈 Generating failure trends report..."

cat > $REPORT_DIR/failure_trends_$DATE.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>tugical Test Failure Trends</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .chart-container { width: 80%; margin: 20px auto; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>tugical Test Failure Trends</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Generated: DATE_PLACEHOLDER</p>
        <ul>
            <li>Total Backend Failures: BACKEND_COUNT</li>
            <li>Total Frontend Failures: FRONTEND_COUNT</li>
            <li>Total E2E Failures: E2E_COUNT</li>
        </ul>
    </div>

    <div class="chart-container">
        <canvas id="failureChart"></canvas>
    </div>

    <script>
        const ctx = document.getElementById('failureChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Backend Failures',
                    data: [12, 8, 15, 6],
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }, {
                    label: 'Frontend Failures',
                    data: [5, 3, 8, 2],
                    borderColor: 'rgb(54, 162, 235)',
                    tension: 0.1
                }, {
                    label: 'E2E Failures',
                    data: [2, 1, 4, 1],
                    borderColor: 'rgb(255, 205, 86)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Test Failures Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    </script>
</body>
</html>
EOF

# Replace placeholders
sed -i "s/DATE_PLACEHOLDER/$DATE/g" $REPORT_DIR/failure_trends_$DATE.html

echo "✅ Failure analysis completed. Reports saved in $REPORT_DIR/"
```

---

## 🚀 テスト環境管理

### Test Environment Setup
```bash
#!/bin/bash
# scripts/setup-test-environment.sh

set -e

echo "🧪 Setting up tugical test environment..."

# 1. Create test databases
echo "📊 Setting up test databases..."
docker-compose exec database mysql -u root -p -e "
CREATE DATABASE IF NOT EXISTS tugical_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS tugical_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON tugical_test.* TO 'tugical'@'%';
GRANT ALL PRIVILEGES ON tugical_e2e.* TO 'tugical'@'%';
FLUSH PRIVILEGES;
"

# 2. Install test dependencies
echo "📦 Installing test dependencies..."

# Backend
cd backend
composer install --dev
php artisan migrate --env=testing --force
php artisan db:seed --env=testing --class=TestSeeder

# Frontend  
cd ../frontend
npm install --include=dev

# LIFF
cd ../liff
npm install --include=dev

# E2E
cd ../
npm install -g @playwright/test
npx playwright install

# 3. Setup test data
echo "🗃️ Setting up test data..."
cd backend
php artisan test:setup-data

# 4. Configure test environment variables
echo "⚙️ Configuring test environment..."
cp .env.testing.example .env.testing

cat > .env.testing << EOF
APP_NAME="tugical (Testing)"
APP_ENV=testing
APP_KEY=$(php artisan key:generate --show)
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=tugical_test
DB_USERNAME=tugical
DB_PASSWORD=tugical

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=15

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

LINE_CHANNEL_ID=test_channel_id
LINE_CHANNEL_SECRET=test_channel_secret
LINE_ACCESS_TOKEN=test_access_token

MAIL_MAILER=log
BROADCAST_DRIVER=log
EOF

# 5. Start test services
echo "🚀 Starting test services..."
docker-compose -f docker-compose.test.yml up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 30

# Health check
echo "🏥 Running health check..."
curl -f http://localhost:8000/health || (echo "❌ Health check failed" && exit 1)

echo "✅ Test environment setup completed!"
echo ""
echo "Available test commands:"
echo "  Backend: cd backend && php artisan test"
echo "  Frontend: cd frontend && npm test"
echo "  LIFF: cd liff && npm test"  
echo "  E2E: npx playwright test"
echo "  All: npm run test:all"
```

### Test Data Management
```php
<?php
// backend/database/seeders/TestSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Store;
use App\Models\Customer;
use App\Models\Menu;
use App\Models\Resource;
use App\Models\Booking;
use Carbon\Carbon;

class TestSeeder extends Seeder
{
    public function run()
    {
        $this->command->info('🌱 Seeding test data...');

        // Create test store
        $store = Store::factory()->create([
            'name' => 'テスト美容室',
            'slug' => 'test-salon',
            'business_hours' => [
                'monday' => ['09:00-18:00'],
                'tuesday' => ['09:00-18:00'],
                'wednesday' => ['09:00-18:00'],
                'thursday' => ['09:00-18:00'],
                'friday' => ['09:00-18:00'],
                'saturday' => ['09:00-17:00'],
                'sunday' => null
            ]
        ]);

        // Create test customers
        $customers = Customer::factory()->count(10)->create([
            'store_id' => $store->id
        ]);

        // Create test resources (staff)
        $resources = Resource::factory()->count(3)->create([
            'store_id' => $store->id,
            'type' => 'staff'
        ]);

        // Create test menus
        $menus = Menu::factory()->count(5)->create([
            'store_id' => $store->id
        ]);

        // Create test bookings
        $this->createTestBookings($store, $customers, $menus, $resources);

        $this->command->info('✅ Test data seeded successfully!');
    }

    private function createTestBookings($store, $customers, $menus, $resources)
    {
        $statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        
        // Create bookings for the next 30 days
        for ($i = 0; $i < 30; $i++) {
            $date = Carbon::now()->addDays($i);
            
            // Skip Sundays (closed)
            if ($date->dayOfWeek === 0) continue;
            
            // Create 3-5 bookings per day
            $bookingsPerDay = rand(3, 5);
            
            for ($j = 0; $j < $bookingsPerDay; $j++) {
                $startHour = rand(9, 16); // 9:00-16:00 start times
                $duration = rand(1, 3); // 1-3 hour duration
                
                Booking::factory()->create([
                    'store_id' => $store->id,
                    'customer_id' => $customers->random()->id,
                    'menu_id' => $menus->random()->id,
                    'resource_id' => $resources->random()->id,
                    'booking_date' => $date->format('Y-m-d'),
                    'start_time' => sprintf('%02d:00', $startHour),
                    'end_time' => sprintf('%02d:00', $startHour + $duration),
                    'status' => $statuses[array_rand($statuses)]
                ]);
            }
        }
    }
}
```

---

## 📱 モバイル・ブラウザテスト

### Cross-Browser Testing
```yaml
# .github/workflows/cross-browser.yml
name: Cross-Browser Testing

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  cross-browser-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
        device: [desktop, mobile]
    
    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Install Playwright
      run: |
        npm install @playwright/test
        npx playwright install

    - name: Run cross-browser tests
      run: |
        npx playwright test \
          --project=${{ matrix.browser }} \
          --grep="@${{ matrix.device }}" \
          --reporter=html

    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report-${{ matrix.browser }}-${{ matrix.device }}
        path: playwright-report/
        retention-days: 7
```

### Mobile Device Testing
```typescript
// tests/e2e/mobile/mobile-booking.spec.ts

import { test, expect, devices } from '@playwright/test';

// iPhone 12 Pro
test.use(devices['iPhone 12 Pro']);

test.describe('Mobile Booking Flow', () => {
  test('LIFF booking flow on iPhone', async ({ page }) => {
    // Mock LIFF environment
    await page.addInitScript(() => {
      window.liff = {
        init: () => Promise.resolve(),
        isLoggedIn: () => true,
        getProfile: () => Promise.resolve({
          userId: 'U1234567890abcdef',
          displayName: '田中太郎'
        }),
        closeWindow: () => {},
      };
    });

    await page.goto('/liff/booking');

    // Test touch interactions
    await page.tap('[data-menu="cut"]');
    await expect(page.locator('.selected-menu')).toBeVisible();

    // Test swipe gestures for date selection
    const dateSlider = page.locator('.date-slider');
    await dateSlider.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0); // Swipe right
    await page.mouse.up();

    // Test mobile-specific form interactions
    await page.tap('[data-field="phone"]');
    await page.keyboard.type('09012345678');

    // Test mobile keyboard interaction
    await page.tap('[data-field="notes"]');
    await page.keyboard.type('初回利用です');

    // Complete booking
    await page.tap('[data-action="confirm"]');
    await page.tap('[data-action="submit"]');

    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('Mobile responsive design verification', async ({ page }) => {
    await page.goto('/admin/dashboard');

    // Check mobile menu
    await expect(page.locator('.mobile-menu-button')).toBeVisible();
    await page.tap('.mobile-menu-button');
    await expect(page.locator('.mobile-menu')).toBeVisible();

    // Check responsive table
    await page.goto('/admin/bookings');
    await expect(page.locator('.mobile-table')).toBeVisible();
    
    // Test horizontal scroll
    const table = page.locator('.mobile-table');
    await table.evaluate(el => el.scrollLeft = 200);
    
    // Verify important columns are still visible
    await expect(page.locator('[data-column="customer"]')).toBeVisible();
    await expect(page.locator('[data-column="time"]')).toBeVisible();
  });
});

// Android tablet testing
test.use(devices['iPad Pro']);

test.describe('Tablet Interface', () => {
  test('Admin interface on tablet', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Login
    await page.fill('[data-field="email"]', 'admin@tugical.com');
    await page.fill('[data-field="password"]', 'password');
    await page.tap('[data-action="login"]');

    // Check tablet layout
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Test drag and drop on tablet
    const booking = page.locator('[data-booking="TG12345678"]');
    const newTimeSlot = page.locator('[data-time="14:00"]');
    
    await booking.dragTo(newTimeSlot);
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

---

## 🔧 テストツール設定

### Jest Configuration
```javascript
// frontend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*): '<rootDir>/src/$1',
    '\\.(css|less|scss|sass): 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx): 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
```

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['json', { outputFile: 'reports/test-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run start:test',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### PHPUnit Configuration
```xml
<!-- backend/phpunit.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="./vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory suffix="Test.php">./tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory suffix="Test.php">./tests/Feature</directory>
        </testsuite>
    </testsuites>
    
    <coverage>
        <include>
            <directory suffix=".php">./app</directory>
        </include>
        <exclude>
            <directory>./app/Console</directory>
            <directory>./app/Exceptions</directory>
            <file>./app/Http/Kernel.php</file>
        </exclude>
        <report>
            <html outputDirectory="./reports/coverage"/>
            <clover outputFile="./reports/coverage.xml"/>
        </report>
    </coverage>
    
    <php>
        <server name="APP_ENV" value="testing"/>
        <server name="BCRYPT_ROUNDS" value="4"/>
        <server name="CACHE_DRIVER" value="array"/>
        <server name="DB_CONNECTION" value="mysql"/>
        <server name="DB_DATABASE" value="tugical_test"/>
        <server name="MAIL_MAILER" value="array"/>
        <server name="QUEUE_CONNECTION" value="sync"/>
        <server name="SESSION_DRIVER" value="array"/>
        <server name="TELESCOPE_ENABLED" value="false"/>
    </php>
</phpunit>
```

---

## 📋 テスト計画・スケジュール

### Test Execution Schedule
```yaml
# テスト実行スケジュール

Daily (平日):
  時間: 9:00, 13:00, 17:00
  内容:
    - Unit Tests (全件)
    - Integration Tests (主要API)
    - 簡易スモークテスト
  実行時間: 約15分
  責任者: 開発者

Weekly (毎週月曜日):
  時間: 2:00 AM
  内容:
    - E2E Tests (全件)
    - Performance Tests
    - Security Scan
    - Cross-browser Tests
  実行時間: 約2時間
  責任者: QA チーム

Monthly (第1土曜日):
  時間: 1:00 AM  
  内容:
    - 包括的セキュリティテスト
    - 負荷テスト (本格的)
    - アクセシビリティテスト
    - モバイルデバイステスト
  実行時間: 約4時間
  責任者: DevOps チーム

Release前:
  内容:
    - 全テストスイート実行
    - 手動探索的テスト
    - ユーザビリティテスト
    - パフォーマンス検証
  実行時間: 約8時間
  責任者: 全チーム
```

### Test Environment Matrix
```yaml
# テスト環境マトリックス

Environments:
  Development:
    URL: http://localhost:3000
    Database: tugical_dev
    Purpose: 開発者個人テスト
    Reset: 毎日

  Testing:
    URL: https://test.tugical.com
    Database: tugical_test  
    Purpose: 自動テスト実行
    Reset: テスト実行毎

  Staging:
    URL: https://staging.tugical.com
    Database: tugical_staging
    Purpose: 統合テスト・E2E
    Reset: 週次

  Production:
    URL: https://tugical.com
    Database: tugical_prod
    Purpose: 本番監視テスト
    Reset: なし (Read-only tests)

Test Data:
  Small Dataset: 10 stores, 100 customers, 1000 bookings
  Medium Dataset: 50 stores, 1000 customers, 10000 bookings  
  Large Dataset: 200 stores, 5000 customers, 50000 bookings
```

---

## 🎯 品質目標・KPI

### Quality Metrics Targets
```yaml
Code Quality:
  - Line Coverage: ≥80%
  - Branch Coverage: ≥75%
  - Function Coverage: ≥85%
  - Complexity Score: ≤10 (per function)
  - Technical Debt Ratio: ≤5%

Test Quality:
  - Test Success Rate: ≥95%
  - Test Execution Time: ≤30 minutes
  - Flaky Test Rate: ≤2%
  - Test Maintenance Effort: ≤20% of development time

Performance:
  - API Response Time: p95 ≤2s
  - Page Load Time: p95 ≤3s
  - Database Query Time: p95 ≤500ms
  - Memory Usage: ≤512MB per request

Security:
  - Critical Vulnerabilities: 0
  - High Vulnerabilities: ≤2
  - Security Test Coverage: 100% (auth/authz)
  - Penetration Test Score: ≥90/100

User Experience:
  - Error Rate: ≤0.1%
  - Accessibility Score: ≥95/100
  - Mobile Compatibility: 100%
  - Browser Compatibility: 95%+
```

### Monitoring Dashboard
```javascript
// scripts/quality-dashboard.js

class QualityDashboard {
  constructor() {
    this.metrics = {};
  }

  async generateDashboard() {
    const dashboard = `
<!DOCTYPE html>
<html>
<head>
    <title>tugical Quality Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { font-size: 2em; font-weight: bold; color: #333; }
        .status.good { color: #28a745; }
        .status.warning { color: #ffc107; }
        .status.bad { color: #dc3545; }
        .chart-container { height: 200px; }
    </style>
</head>
<body>
    <h1>tugical Quality Dashboard</h1>
    <div class="dashboard">
        <div class="card">
            <h3>Test Coverage</h3>
            <div class="metric status good">85.2%</div>
            <p>Target: ≥80%</p>
        </div>
        
        <div class="card">
            <h3>Test Success Rate</h3>
            <div class="metric status good">97.8%</div>
            <p>Target: ≥95%</p>
        </div>
        
        <div class="card">
            <h3>Performance Score</h3>
            <div class="metric status warning">78/100</div>
            <p>Target: ≥80</p>
        </div>
        
        <div class="card">
            <h3>Security Score</h3>
            <div class="metric status good">94/100</div>
            <p>Target: ≥90</p>
        </div>
        
        <div class="card">
            <h3>Test Execution Time</h3>
            <div class="chart-container">
                <canvas id="executionChart"></canvas>
            </div>
        </div>
        
        <div class="card">
            <h3>Error Rate Trend</h3>
            <div class="chart-container">
                <canvas id="errorChart"></canvas>
            </div>
        </div>
    </div>

    <script>
        // Test execution time chart
        new Chart(document.getElementById('executionChart'), {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
                datasets: [{
                    label: 'Execution Time (minutes)',
                    data: [25, 28, 22, 26, 24],
                    borderColor: '#007bff',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });

        // Error rate chart
        new Chart(document.getElementById('errorChart'), {
            type: 'bar',
            data: {
                labels: ['Unit', 'Integration', 'E2E', 'Performance'],
                datasets: [{
                    label: 'Error Rate (%)',
                    data: [0.5, 1.2, 2.1, 0.8],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#17a2b8']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, max: 5 } }
            }
        });
    </script>
</body>
</html>
    `;
    
    require('fs').writeFileSync('reports/quality-dashboard.html', dashboard);
    console.log('📊 Quality dashboard generated: reports/quality-dashboard.html');
  }
}

---

## 🏁 まとめ・次のステップ

### テスト戦略の重要ポイント

1. **包括的品質保証**
   - Unit → Integration → E2E → Performance の段階的テスト
   - 80%以上のコードカバレッジ維持
   - 自動化による継続的品質改善

2. **予約システム特有の考慮事項**
   - データ整合性の厳密な検証
   - 同時予約・競合状態のテスト
   - LINE API連携の信頼性確保
   - Multi-tenant分離の安全性

3. **運用・保守性の重視**
   - CI/CD統合による自動実行
   - 分かりやすいテスト結果・レポート
   - 障害分析・改善プロセス

### 導入ロードマップ

#### Phase 1: 基盤構築（1-2ヶ月）
- [ ] Unit Tests実装（Backend/Frontend）
- [ ] CI/CD パイプライン構築
- [ ] テスト環境セットアップ
- [ ] カバレッジ測定開始

#### Phase 2: 統合テスト（2-3ヶ月）
- [ ] API Integration Tests実装
- [ ] LINE連携テスト実装
- [ ] Database整合性テスト
- [ ] Security Tests統合

#### Phase 3: E2E・性能テスト（3-4ヶ月）
- [ ] Playwright E2Eテスト実装
- [ ] Performance Testing導入
- [ ] Cross-browser Testing
- [ ] Mobile Testing強化

#### Phase 4: 高度化・最適化（4-6ヶ月）
- [ ] AI/ML品質分析導入
- [ ] Visual Regression Testing
- [ ] Chaos Engineering実験
- [ ] ユーザビリティテスト自動化

### 成功指標

```yaml
Short-term (3ヶ月):
  - Unit Test Coverage: 70%+
  - CI/CD Pipeline稼働率: 95%+
  - テスト実行時間: 30分以内
  - 障害検出率: 80%+

Medium-term (6ヶ月):
  - Unit Test Coverage: 80%+
  - E2E Test Coverage: 主要フロー100%
  - Performance SLA: 95%達成
  - セキュリティテスト: 月次実行

Long-term (12ヶ月):
  - 全テスト自動化率: 90%+
  - 本番障害: 月次1件以下
  - テスト ROI: 200%+
  - 品質スコア: 90/100
```

### チーム体制・責任

```yaml
Development Team:
  - Unit Tests作成・保守
  - Integration Tests実装
  - Test-First開発の実践
  - Code Review時の品質チェック

QA Team:
  - E2E Test設計・実装
  - Manual Testing実行
  - Test Plan策定
  - 品質メトリクス分析

DevOps Team:
  - CI/CD Pipeline構築・保守
  - Performance Testing実行
  - Security Testing統合
  - テスト環境管理

Product Team:
  - ユーザビリティテスト要件定義
  - 受入れ基準設定
  - 品質目標設定
  - ステークホルダー報告
```

### 投資対効果

```yaml
コスト（年間）:
  - テストツール・ライセンス: ¥500,000
  - テスト環境インフラ: ¥1,200,000
  - チーム教育・トレーニング: ¥800,000
  - 外部コンサルティング: ¥1,000,000
  合計: ¥3,500,000

効果（年間）:
  - 障害対応コスト削減: ¥5,000,000
  - 開発効率向上: ¥8,000,000
  - 顧客満足度向上: ¥3,000,000
  - セキュリティ事故回避: ¥10,000,000
  合計: ¥26,000,000

ROI: 743% (投資対効果)
```

## 📞 サポート・お問い合わせ

### テスト関連サポート体制

```yaml
Level 1 - 開発者サポート:
  - 対象: Unit/Integration Tests
  - 対応時間: 営業時間内
  - 連絡先: dev-support@tugilo.com

Level 2 - QA サポート:
  - 対象: E2E/Performance Tests
  - 対応時間: 営業時間内 + オンコール
  - 連絡先: qa-support@tugilo.com

Level 3 - DevOps サポート:
  - 対象: CI/CD/Infrastructure
  - 対応時間: 24/7 オンコール
  - 連絡先: devops-support@tugilo.com

緊急時サポート:
  - 対象: 本番環境テスト障害
  - 対応時間: 24/7
  - 連絡先: emergency@tugilo.com
```

### ドキュメント・リソース

- **テスト実装ガイド**: `docs/testing/implementation-guide.md`
- **CI/CD設定手順**: `docs/testing/cicd-setup.md` 
- **トラブルシューティング**: `docs/testing/troubleshooting.md`
- **ベストプラクティス**: `docs/testing/best-practices.md`
- **FAQ**: `docs/testing/faq.md`

---

## 📚 変更履歴

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-06-28 | 初版作成 | tugilo inc. |

---

**Next Steps**: 
1. VPS環境でのテスト実装開始
2. セキュリティガイドライン策定
3. 運用マニュアル詳細化
