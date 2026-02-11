# 管理画面 認証・ロール・ダッシュボード Fit & Gap v1.2.1

**Version**: 1.0  
**Date**: 2025-02-11  
**基準仕様**: admin_auth_and_role_dashboard_spec_v1.2.1.md  
**目的**: spec v1.2.1 に対する実装状況を「実装済 / 一部 / 未実装 / 不明」で判定し、根拠と確認手順を記録する。

---

## 調査した実装箇所一覧

### ルート・エントリ

| 種類 | パス | 役割 |
|------|------|------|
| Laravel Web | `backend/routes/web.php` | `/` → `/admin` リダイレクト。`/admin/{any?}` → admin ビュー（SPA）。`/login` → 401 JSON（API 用）。 |
| SPA エントリ | `backend/resources/js/pages/admin/index.tsx` | `#admin-app` に `App` をマウント。 |
| 管理画面ルート | `backend/resources/js/pages/admin/App.tsx` | BrowserRouter basename=/admin。Route / → Navigate /login、/login → LoginPage、/dashboard → DashboardPage。Step 1 実装済。 |

### 認証

| 種類 | パス | 役割 |
|------|------|------|
| API 認証 | `backend/routes/api.php` | `POST /api/v1/auth/login`, `POST logout`, `GET user`（auth:sanctum）。 |
| AuthController | `backend/app/Http/Controllers/Api/AuthController.php` | login: email+store_id+password、Sanctum トークン発行、UserResource 返却。logout: トークン削除。user: 現ユーザー返却。 |
| LoginRequest | `backend/app/Http/Requests/LoginRequest.php` | email, password, store_id バリデーション。 |
| authStore | `backend/resources/js/stores/authStore.ts` | login/logout/checkAuth、user/role/permissions_summary、canManageSettings 等。persist で永続化。 |
| LoginPage | `backend/resources/js/pages/admin/auth/LoginPage.tsx` | フォーム・login()・navigate('/dashboard')。App の Route /login で表示。Step 1 実装済。 |

### ロール・権限

| 種類 | パス | 役割 |
|------|------|------|
| UserResource | `backend/app/Http/Resources/UserResource.php` | role, role_display_name, permissions_summary（can_manage_users, can_manage_settings, can_view_analytics）。 |
| authStore | 上記 | isOwner, isManager, canManageUsers, canManageSettings, canViewAnalytics。 |
| DashboardLayout | `backend/resources/js/components/admin/layout/DashboardLayout.tsx` | ナビ一覧に「設定」を含む。**canManageSettings でフィルタしていない。** 且つ **App で未使用。** |

### ダッシュボード

| 種類 | パス | 役割 |
|------|------|------|
| DashboardPage | `backend/resources/js/pages/admin/dashboard/DashboardPage.tsx` | App の Route /dashboard で表示。今日の予約・売上・顧客数等を mock で表示。API 未接続。要対応・直近変更・ひとことメッセージは Step 7〜10 で対応予定。 |
| bookings API | `backend/app/Http/Controllers/Api/BookingController.php` | index(): date, status, resource_id, customer_id でフィルタ。auth()->user()->store_id でスコープ。 |
| api.getBookings | `backend/resources/js/services/api.ts` | getBookings(filters)。FilterOptions で date 等を渡す。BookingsPage で date 使用実績あり。 |

### セキュリティ・スコープ

| 種類 | パス | 役割 |
|------|------|------|
| TenantScope | `backend/app/Models/Scopes/TenantScope.php` | auth()->user()->store_id でクエリに where store_id を付与。Booking 等に適用。 |
| BookingController | 上記 | $storeId = auth()->user()->store_id。getBookings($storeId, $filters)。 |
| User モデル | `backend/app/Models/User.php` | store_id, role。Sanctum HasApiTokens。 |

---

## A. 認証（/admin/login → /admin/dashboard）

| 観点 | 判定 | 根拠・該当コード | 確認方法（不明時） |
|------|------|-------------------|---------------------|
| トークン認証（Sanctum） | **実装済** | AuthController::login で createToken。api.php で auth:sanctum。authStore で token 保持。 | ログイン後 DevTools の Network で API に Authorization: Bearer が付くか確認。 |
| ログイン画面（共通） | **実装済** | App.tsx に BrowserRouter（basename=/admin）を導入。Route path="/login" → LoginPage。/admin/login でログインフォームが表示される。Step 1 実装（2025-02-11）。 | ブラウザで /admin/login を開き、ログインフォームが出る（Yes）。 |
| 未ログイン時 /admin/dashboard → /login リダイレクト | **実装済** | ProtectedRoute.tsx で authStore の isAuthenticated または token を判定。未認証時は Navigate to="/login" replace state={{ from: location }}。App.tsx の /dashboard を ProtectedRoute でラップ。Step 2 実装（2025-02-11）。 | 未ログインで /admin/dashboard を開く → /admin/login に飛ぶ（Yes）。 |
| ログイン成功後 /dashboard へ遷移 | **実装済** | App.tsx に Route path="/dashboard" → DashboardPage。LoginPage で navigate('/dashboard') により /admin/dashboard に遷移しダッシュボード表示。Step 1 実装（2025-02-11）。 | ログイン成功で /admin/dashboard が表示される（Yes）。 |
| ログアウト後 /login へ | **一部** | authStore.logout で clearAuth。**ログアウト後に navigate('/login') する呼び出しが LoginPage 外で必要。** 且つ Router 未実装。 | Router 実装後、ログアウトで /admin/login に飛ぶか。 |
| store_id スコープ（ログイン） | **実装済** | AuthController::login で User::where('email')->where('store_id', $credentials['store_id'])。LoginRequest で store_id 必須。 | 別 store_id のユーザーでログイン試行し拒否されるか。 |

---

## B. ロール（owner/manager/staff/reception）

| 観点 | 判定 | 根拠・該当コード | 確認方法（不明時） |
|------|------|-------------------|---------------------|
| ロールの保持場所（users.role） | **実装済** | UserResource で role, permissions_summary を返却。authStore の user に格納。 | GET /api/v1/auth/user のレスポンスに role, permissions_summary が含まれるか。 |
| 表示制御（設定メニュー） | **未実装** | DashboardLayout の navigation に「設定」が固定で含まれる。canManageSettings でフィルタしていない。且つ Layout は App で未使用。 | Layout を表示した状態で owner と staff でログインし、設定の有無が変わるか。現状は全員に表示。 |
| API 権限制御の過剰追加なし | **実装済** | api.php は auth:sanctum のみ。Controller 側でロールによる分岐は行っていない（store_id のみ）。 | 仕様「API 権限制御は追加しない」に合致。 |

---

## C. ダッシュボード必須 3 ブロック

| 観点 | 判定 | 根拠・該当コード | 確認方法（不明時） |
|------|------|-------------------|---------------------|
| 要対応アクション（例外検知） | **未実装** | DashboardPage に該当ブロックなし。仕様 5.5 の例外条件（未確定・重複疑い等）のフロント判定・表示がない。 | ダッシュボードに「要対応」リストが表示され、例外条件該当件数に応じて変わるか。 |
| 今日の予約タイムライン | **一部** | DashboardPage に「今日の予約」リストはあるが **mock データ**。次の予約の強調なし。API（getBookings with date=今日）未使用。 | 本日の日付で getBookings({ date }) を呼び、表示されるか。次の予約が視覚的に強調されているか。 |
| 直近の変更・キャンセル | **未実装** | DashboardPage に「最近のアクティビティ」はあるが仕様の「直近の変更・キャンセル」ブロック（ステータス変更・キャンセル一覧＋確認導線）ではない。mock。 | 直近のキャンセル・ステータス変更が一覧され、予約詳細・顧客詳細への導線があるか。 |
| データ取得が既存 API の範囲 | **実装済（API 側）** | BookingController::index に date, status あり。getBookings(filters) で date 渡し可能。新規 API なし。 | ダッシュボード用の新規エンドポイントが追加されていないか routes/api.php を確認。 |

---

## D. ひとことメッセージ（相棒）

| 観点 | 判定 | 根拠・該当コード | 確認方法（不明時） |
|------|------|-------------------|---------------------|
| 固定文＋条件分岐のみ | **未実装** | ひとことメッセージを表示するコンポーネント・ロジックが無い。 | ダッシュボード最上段に 1 文が表示されるか。 |
| 優先順位 A→B→C | **未実装** | 同上。 | 要対応≥1 → ルール A、今日 0 件 → B、それ以外 → C の文言になるか。 |
| フォールバック（データ取れない場合） | **未実装** | 同上。 | 今日の予約件数・要対応件数のみで文言が決まるフォールバックがあるか。 |
| 文言ガイド準拠 | **未実装** | 文言実装なし。 | 句読点少なめ・1 文・命令しない・説教しないが守られているか。 |
| 心理設計の深掘りが [FUTURE] に隔離 | **実装済（仕様側）** | spec v1.2.1 の「将来拡張スロット（FUTURE）」に記載。コードに時間帯別・人格チューニングが無い。 | コードベースで「相棒」「トーン」「A/B」等を検索し、MVP 範囲外の実装が無いか。 |

---

## E. セキュリティ

| 観点 | 判定 | 根拠・該当コード | 確認方法（不明時） |
|------|------|-------------------|---------------------|
| store_id 強制（クエリスコープ） | **実装済** | TenantScope が Booking 等に適用。BookingController::index で auth()->user()->store_id。 | 他 store の ID を指定した API を叩いても自 store のデータのみ返るか。 |
| ロール改ざん対策（サーバー側で role を信頼） | **実装済** | ロールは UserResource で DB の users.role から取得。クライアントから role を送って変更する API は無い。 | クライアントで token や user を改ざんしても API は auth()->user() を参照するため、サーバー側で正しい role が使われる。 |
| 他店舗参照不可 | **実装済** | TenantScope + 各 Controller の store_id チェック。BookingController::show 等で $booking->store_id !== auth()->user()->store_id で 403。 | 他店舗の booking id で GET /api/v1/bookings/{id} を叩き 403 になるか。 |

---

## F. “後回し固定”の担保（v1.2.1 の肝）

| 観点 | 判定 | 根拠・該当コード | 確認方法（不明時） |
|------|------|-------------------|---------------------|
| 新規 API なし | **実装済** | ダッシュボード用の /dashboard/stats 等は api.php に無い。既存 GET /bookings の date/status で足りる。 | routes/api.php に dashboard 用の新ルートが無いか確認。 |
| 新規テーブルなし | **実装済** | メッセージ履歴・ユーザー反応用のマイグレーションなし。 | database/migrations に dashboard 用が無いか確認。 |
| 学習/パーソナライズなし | **実装済** | 該当コードなし。 | コードベースで learning, personalize, recommend 等を検索。 |
| 時間帯別/人格チューニングは [FUTURE] に残し実装しない | **実装済（仕様）** | spec の「将来拡張スロット」に記載。実装なし。 | 同上。 |

---

## まとめ（Gap 一覧）

| セクション | 未実装・一部の項目 | 対応方針 |
|------------|---------------------|----------|
| A. 認証 | ログイン画面・ログイン成功後 /dashboard は Step 1、未ログイン時リダイレクトは Step 2 で実装済。ログアウト後 /login は Step 4 で対応。 | Step 4: logout 後に navigate('/login'). |
| B. ロール | 設定メニューを canManageSettings で出し分けていない。Layout が未使用。 | Router 実装後に Layout で navigation を canManageSettings でフィルタ。 |
| C. 必須 3 ブロック | 要対応アクション未実装。今日の予約は mock。直近の変更・キャンセル未実装。 | 既存 getBookings で本日・直近を取得し、要対応はフロントで仕様 5.5 の条件に従いフィルタ。3 ブロックを DashboardPage に追加。 |
| D. ひとことメッセージ | 未実装。 | 最上段にコンポーネントを追加。今日件数・要対応件数・次の予約時刻を既存データから算出し、A→B→C で固定文を表示。 |
| E, F | 特になし（実装済または仕様で担保）。 | — |

**不明**: なし。上記の確認方法で判定可能。

---

**以上、Fit & Gap とする。実装計画は「未実装・一部」のみをタスク化する。**
