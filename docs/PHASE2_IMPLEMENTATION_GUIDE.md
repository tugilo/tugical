# tugical Phase 2 - ビジネスロジック実装ガイド（最終版）

## 📋 現在の状況
- **Phase 1完了**: Docker環境 + 全17テーブル作成済み
- **Repository**: https://github.com/tugilo/tugical (develop branch)
- **次の作業**: コアサービス層の実装
- **最終更新**: 2025-06-30

---

## 🔴 **最重要: 進捗の完全記録ルール**

### **各作業ごとに必ず3つのアクションを実行**
1. **コード実装**
2. **Gitプッシュ**
3. **ドキュメント更新**

**理由**: 任意の端末・任意のタイミングで作業を再開可能にするため

---

## 📝 **ドキュメント更新ルール**

### **作業開始時**
```markdown
# CURRENT_FOCUS.mdに必ず記載
- 現在作業中のファイル名
- 実装している機能
- 参照している仕様書のセクション
- 発生した問題や疑問点
```

### **作業終了時（各ステップ）**
```markdown
# PROGRESS.mdに追記
- 完了した機能
- 作成/更新したファイル一覧
- テスト実行結果
- 次回の開始ポイント

# CURRENT_FOCUS.mdを更新
- 次の作業内容を明記
- 必要なコマンドを記載
```

### **作業中断時（CRITICAL）**
```bash
# 必ず以下を実行してから端末を閉じる
1. git add . && git commit -m "WIP: [詳細な作業内容]"
2. git push origin develop
3. CURRENT_FOCUS.mdに現在の状況を詳細に記載
4. git add docs/ && git commit -m "docs: 作業中断時の状況を記録"
5. git push origin develop
```

---

## 🚀 **Phase 2 実装タスク（ステップ別実行指示）**

### **Step 1: サービスクラスの作成**
```bash
# 実装
cd backend
php artisan make:service BookingService
php artisan make:service AvailabilityService
php artisan make:service HoldTokenService
php artisan make:service NotificationService

# Gitプッシュ
git add .
git commit -m "feat(phase2): コアサービスクラス4個を作成

✨ 新規作成:
- app/Services/BookingService.php (予約ビジネスロジック)
- app/Services/AvailabilityService.php (空き時間判定)
- app/Services/HoldTokenService.php (仮押さえ管理)
- app/Services/NotificationService.php (LINE通知)

🎯 次回: BookingServiceのcreateBooking()実装から開始"
git push origin develop

# ドキュメント更新
# PROGRESS.mdに以下を追記:
# ✅ Phase 2.1 完了: サービスクラス基盤作成
# - BookingService.php 作成 (予約管理)
# - AvailabilityService.php 作成 (空き時間)
# - HoldTokenService.php 作成 (仮押さえ)
# - NotificationService.php 作成 (通知)
# 
# 🎯 次回開始点: BookingServiceの実装

git add docs/
git commit -m "docs: Phase 2.1 サービスクラス作成完了を記録"
git push origin develop
```

### **Step 2: BookingService実装**
```bash
# 実装前にCURRENT_FOCUS.mdに記載:
# 🎯 現在の作業
# ファイル: backend/app/Services/BookingService.php
# 実装メソッド: createBooking, checkTimeConflict, calculateTotalPrice
# 参照仕様: tugical_requirements_specification_v1.0.md#booking-system
# 重要ポイント: Hold Token統合, マルチテナント対応

# BookingService.php実装完了後
git add .
git commit -m "feat(booking): BookingService実装完了

✨ 実装機能:
- createBooking(): 予約作成・Hold Token統合
- checkTimeConflict(): リアルタイム競合検出
- calculateTotalPrice(): 動的料金計算
- validateAndReleaseHoldToken(): 仮押さえ管理

🛡️ セキュリティ: マルチテナント分離対応
⚡ パフォーマンス: Redis Cache活用

テスト結果: [実行後に記載]"
git push origin develop

# ドキュメント更新
git add docs/
git commit -m "docs: BookingService実装完了、次はAvailabilityService"
git push origin develop
```

### **Step 3: AvailabilityService実装**
```bash
# 同様のパターンで実装
# - 作業開始前にCURRENT_FOCUS.md更新
# - 実装完了後にGitコミット・プッシュ
# - ドキュメント更新・コミット・プッシュ
```

### **Step 4: HoldTokenService実装**
```bash
# Redis TTL機能を活用した実装
# 暗号学的に安全なトークン生成
```

### **Step 5: NotificationService実装**
```bash
# LINE API統合
# テンプレート変数置換機能
```

### **Step 6: 統合テスト実装**
```bash
# Unit Tests作成
# Feature Tests作成
# 80%+ coverage確認
```

---

## 📋 **ドキュメントテンプレート**

### **CURRENT_FOCUS.md 更新例**
```markdown
# tugical 現在の焦点 - Phase 2.2 BookingService実装

## 🎯 現在の作業
**開始日時**: 2025-06-30 17:00  
**ファイル**: backend/app/Services/BookingService.php  
**メソッド**: createBooking()  
**進捗**: Hold Token検証部分を実装中  

### 実装中のコード位置
```php
public function createBooking(int $storeId, array $bookingData): Booking
{
    // ✅ 完了: バリデーション
    // 🔄 実装中: Hold Token検証
    // ⏳ 未着手: 競合チェック
}
```

### 参照している仕様
- tugical_requirements_specification_v1.0.md#booking-equation
- tugical_database_design_v1.0.md#bookings-table
- Hold Token System: 10分間排他制御

### 発生した問題
- ❌ RedisへのCache facade接続でエラー
- ✅ 解決済み: config/cache.phpでredis設定を確認
- ⚠️ 要確認: HoldTokenService依存性注入

### 次の作業ステップ
1. Hold Token検証ロジック完成
2. checkTimeConflict()メソッドの実装
3. calculateTotalPrice()メソッドの実装
4. 単体テスト作成

### 実行コマンド
```bash
# テスト実行
make test

# サービス確認
make shell
cd /var/www/html && php artisan tinker
```

### 中断時の状況
- [ ] まだ中断していない
- [ ] コードは途中段階
- [ ] テストは未実行
```

### **PROGRESS.md 更新例**
```markdown
## Phase 2: ビジネスロジック実装

### ✅ 2025-06-30 17:30 Phase 2.2 完了
**BookingService 実装完了**

#### 実装内容
- `createBooking()` - 予約作成・Hold Token統合・通知自動送信
- `checkTimeConflict()` - リアルタイム競合チェック・store_id分離
- `calculateTotalPrice()` - 動的料金計算（ベース+オプション+リソース差額）
- `validateAndReleaseHoldToken()` - 仮押さえ管理・自動解放

#### 技術詳細
- **ファイル**: backend/app/Services/BookingService.php (380行)
- **依存関係**: HoldTokenService, NotificationService注入
- **テスト結果**: 12/12 passed
- **パフォーマンス**: Redis Cache活用、Query最適化
- **セキュリティ**: マルチテナント分離、SQL Injection対策

#### Git情報
- **コミット**: feat(booking): BookingService実装完了 (a1b2c3d)
- **ブランチ**: develop
- **プッシュ済み**: ✅

### 🚀 次回開始点
```bash
cd backend
# AvailabilityServiceの実装から開始
vim app/Services/AvailabilityService.php

# 実装する主要メソッド:
# - getAvailableSlots() 空き時間枠検索
# - isResourceAvailable() リソース可用性
# - isWithinBusinessHours() 営業時間チェック
```

#### 推定作業時間
- AvailabilityService実装: 2-3時間
- HoldTokenService実装: 1-2時間
- NotificationService実装: 2-3時間
- 統合テスト: 1-2時間
```

---

## 🔍 **進捗確認コマンド**

```bash
# 最新の進捗を確認
cat docs/PROGRESS.md | tail -30
cat docs/CURRENT_FOCUS.md

# 実装済みサービスを確認
ls -la backend/app/Services/
git log --oneline | head -10

# テスト実行状況
make test
make shell
php artisan test --coverage

# 環境状態確認
make health
make status
```

---

## ⚠️ **緊急時・中断時の対応**

### **作業を中断する場合（MUST DO）**
```bash
# Step 1: 現在の作業をコミット（WIP含む）
git add .
git status
git commit -m "WIP: [詳細な現在の作業内容・問題点・次の手順]

現在実装中:
- ファイル: backend/app/Services/BookingService.php
- メソッド: createBooking()
- 進捗: Hold Token検証部分まで完了
- 問題: Redis接続エラーが発生中
- 次回: config/cache.php確認から再開

参照:
- Line 45-67: Hold Token検証ロジック
- 要テスト: $this->holdTokenService->validate()
"

# Step 2: リモートにプッシュ
git push origin develop

# Step 3: 現在の状況を詳細にCURRENT_FOCUS.mdに記載
# (上記テンプレート参照)

# Step 4: ドキュメントをコミット・プッシュ
git add docs/
git commit -m "docs: 作業中断時の詳細状況を記録

中断理由: [理由を記載]
次回再開時の注意点: [重要事項を記載]
推定残り時間: [予想時間]"
git push origin develop

# Step 5: 状況確認
git log --oneline | head -5
cat docs/CURRENT_FOCUS.md | tail -20
```

### **他の端末・他のメンバーが作業を再開する場合**
```bash
# Step 1: 最新状況を取得
git pull origin develop

# Step 2: 現在の状況を確認
cat docs/CURRENT_FOCUS.md
cat docs/PROGRESS.md | tail -30

# Step 3: 環境を立ち上げ
make setup  # 必要に応じて
make up
make health

# Step 4: 作業再開
# CURRENT_FOCUS.mdの指示に従って作業継続
```

---

## ✅ **Phase 2 完了条件**

- [ ] **4つのサービスクラス実装完了**
  - [ ] BookingService.php (予約管理)
  - [ ] AvailabilityService.php (空き時間判定)
  - [ ] HoldTokenService.php (仮押さえ管理)
  - [ ] NotificationService.php (LINE通知)

- [ ] **ドキュメント完全更新**
  - [ ] 各ステップごとにGitコミット+ドキュメント更新
  - [ ] PROGRESS.mdに全実装内容記載
  - [ ] CURRENT_FOCUS.mdが最新状態

- [ ] **テスト実装**
  - [ ] Unit Tests: 80%+ coverage
  - [ ] Feature Tests: 主要APIエンドポイント
  - [ ] 統合テスト: サービス間連携

- [ ] **継続性確保**
  - [ ] 他の端末で `git pull` 後すぐに作業再開可能
  - [ ] すべてのWIPコミットが適切に記録済み
  - [ ] 次のPhase 3開始準備完了

---

## 📚 **参照ドキュメント**

- **tugical_requirements_specification_v1.0.md**: ビジネス要件
- **tugical_database_design_v1.0.md**: データベース設計  
- **tugical_api_specification_v1.0.md**: API仕様
- **tugical_test_strategy_v1.0.md**: テスト戦略

---

**最終更新**: 2025-06-30  
**作成者**: AI Assistant + User  
**目的**: 端末に依存しない開発継続性の確保 