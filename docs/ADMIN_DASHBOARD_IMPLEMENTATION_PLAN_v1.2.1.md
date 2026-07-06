# 管理画面 認証・ロール・ダッシュボード 実装計画 v1.2.1

**Version**: 1.2.2  
**作成日**: 2026-02-11 17:43  
**更新日**: 2026-02-12 01:00  
**基準**: admin_auth_and_role_dashboard_spec_v1.2.1.md, ADMIN_DASHBOARD_FIT_GAP_v1.2.1.md  
**ルール**: MVP_EXECUTION_RULES.md に従う。未実装・不明の箇所のみタスク化。各ステップ終了時に Fit&Gap・STATUS・本計画書を更新する。

---

## 修正点サマリ（API 一元化・例外条件固定）

- **API 呼び出しの一元化**: DashboardPage は初回マウント時に **1 回のみ** 予約 API を呼び出す。取得データを state に保持し、要対応・今日の予約・直近変更の各ブロックは **同一 state を参照して表示を構築** する。ブロック単位での追加 API 呼び出しは **禁止**。パフォーマンス最適化・将来の API 分割は MVP では行わない。
- **例外条件の固定**: Step 8（要対応アクション）の例外条件は **仕様書（admin_auth_and_role_dashboard_spec_v1.2.1.md）に記載されている条件のみ** 実装する。閾値（N 時間など）は仕様の値をそのまま使用する。仕様にない例外・「より良い例外」「改善提案」は実装しない。

---

## 差分サマリ（取得範囲固定・変更条件固定）

- **取得範囲の固定（Step 7）**: API 取得範囲は「今日を含む前後 3 日（計 7 日間）」を上限とする。仕様に明記されていない期間拡張は行わない。将来拡張の検討はしない（MVP では扱わない）。
- **直近変更の判定固定（Step 9）**: 直近変更の判定は「status が cancelled または changed のもの」に限定する。updated_at のみを基準とした変更判定は行わない。仕様に定義されていない独自判定は実装しない。

---

## 前提（Fit & Gap の結果）

- **実装済**: 認証 API（login/logout/user）、store_id スコープ（TenantScope・Controller）、UserResource（role, permissions_summary）、authStore、LoginPage コンポーネント、BookingController::index（date/status 対応）、新規 API/テーブルなし。
- **未実装・一部**: SPA に Router が無く /login・/dashboard が機能していない。ルートガードなし。設定メニューのロール出し分けなし。ダッシュボードの必須 3 ブロック（要対応・今日の予約 API 接続・直近変更キャンセル）とひとことメッセージが未実装。

---

## ルール（MUI移行計画との整合）

1. **MUI 移行 Phase 0（依存追加＋ThemeProvider＋テーマ定義）は、Dashboard Step 3〜10 着手前に完了必須とする。** ADMIN_MUI_MIGRATION_PLAN_v1.0.md（v1.1）の Phase 0 を先に完了すること。
2. **Dashboard Step 3〜10 は「新規実装扱い」とし、UI は MUI コンポーネントで組む。** Card / Typography / Stack / Alert / List を基本とする。Tailwind を新規で増やさない（既存部分は触らない）。
3. **既存の自作 Modal / DatePicker / FormField などの置換は、MUI 移行計画の Phase 1〜3 で順番に実施する。** ダッシュボード作業と混ぜない。
4. **導線（他画面へのナビ）は AdminShell で提供する。** ダッシュボード単体ではメニューを持たず、ログイン後の全ページを AdminShell（MUI AppBar + 左 Drawer）がラップし、予約・メニュー・顧客・リソース・設定への遷移を可能にする。

---

## Step 1 ✅: SPA に React Router を導入し /login と /dashboard を定義する

| 項目 | 内容 |
|------|------|
| **目的** | `/admin` 配下で SPA 内パス `/login` と `/dashboard` を有効にし、未認証時はログイン画面、認証済み時はダッシュボードへ遷移できるようにする。 |
| **変更対象** | `resources/js/pages/admin/App.tsx`（Router でラップし Route で /login → LoginPage、/dashboard → 暫定で既存 DashboardPage またはプレースホルダ）。`resources/js/pages/admin/index.tsx` は変更不要（App をマウントするだけ）。必要に応じ `BrowserRouter` の basename を `'/admin'` に設定。 |
| **完了条件** | (1) ブラウザで `/admin/login` を開くとログインフォームが表示される（Yes/No）。(2) ログイン成功後に `/admin/dashboard` に遷移し、ダッシュボードらしい画面が表示される（Yes/No）。 |
| **手動テスト** | ① `/admin/login` を開く → メール・パスワード・店舗選択のフォームが出る。② 正しい認証情報でログイン → `/admin/dashboard` に遷移し、何らかのコンテンツが表示される。 |
| **ドキュメント更新** | Fit&Gap「A. 認証」の「ログイン画面（共通）」「ログイン成功後 /dashboard へ遷移」を **一部→実装済** に更新。本計画書 Step 1 を 🟡→✅。実施日・変更ファイル・サマリーを本計画書の「実施ログ」に追記。 |

---

## Step 2 ✅: 未認証時は /login へリダイレクトするルートガードを実装する

| 項目 | 内容 |
|------|------|
| **目的** | 認証が必要なルート（/dashboard およびその配下）にアクセスした際、未認証なら `/login` にリダイレクトする。 |
| **変更対象** | 認証済みのみ通過する `ProtectedRoute`（または同等）コンポーネントを用意し、authStore.isAuthenticated または token の有無で判定。未認証なら `<Navigate to="/login" replace state={{ from: location }} />`。App の Route で /dashboard 側をこのコンポーネントでラップする。 |
| **完了条件** | 未ログインの状態で `/admin/dashboard` にアクセスすると、`/admin/login` にリダイレクトされる（Yes/No）。 |
| **手動テスト** | ログアウト状態（またはシークレットウィンドウ）で `https://.../admin/dashboard` を開く → 即 `/admin/login` に飛ぶ。 |
| **ドキュメント更新** | Fit&Gap「A. 認証」の「未ログイン時 /admin/dashboard → /login リダイレクト」を **未実装→実装済** に更新。本計画書 Step 2 を 🟡→✅。実施ログに追記。 |

---

## Step 3 ⬜: 認証済みで /login にアクセスした場合は /dashboard へリダイレクトする

| 項目 | 内容 |
|------|------|
| **目的** | すでにログイン済みのユーザーが `/login` を開いた場合、ログイン画面を表示せず `/dashboard` にリダイレクトする。 |
| **変更対象** | `/login` を描画するルートの先で、authStore.isAuthenticated が true なら `<Navigate to="/dashboard" replace />` を返すコンポーネントでラップするか、Route の element 内で判定。**UI は MUI で実装する**（本 Step は判定のみのためコンポーネント追加が少ない場合あり）。 |
| **完了条件** | ログイン済みの状態で `/admin/login` を開くと、`/admin/dashboard` にリダイレクトされる（Yes/No）。 |
| **手動テスト** | ログインした状態でブラウザのアドレスバーに `/admin/login` を入力してアクセス → `/admin/dashboard` に飛ぶ。 |
| **ドキュメント更新** | Fit&Gap 該当箇所があれば更新。本計画書 Step 3 を 🟡→✅。実施ログに追記。 |

---

## Step 4 ⬜: ログアウト後に /login へ遷移する

| 項目 | 内容 |
|------|------|
| **目的** | ログアウト実行後、必ず `/login` に遷移する。 |
| **変更対象** | ログアウトを呼び出す箇所（DashboardLayout のログアウトボタン等）。authStore.logout() の後に `navigate('/login', { replace: true })` を実行する。LoginPage 内で既に遷移している場合は、Layout 側で logout 後に navigate。**UI は MUI で実装する**（該当箇所がある場合）。 |
| **完了条件** | ログアウトボタン（または同等）を押すと、API が呼ばれローカル状態がクリアされた上で `/admin/login` が表示される（Yes/No）。 |
| **手動テスト** | ログイン済みの状態でログアウトを実行 → `/admin/login` が表示される。再度 /dashboard に直アクセスすると Step 2 により /login に飛ぶ。 |
| **ドキュメント更新** | Fit&Gap「A. 認証」の「ログアウト後 /login へ」を **一部→実装済** に更新。本計画書 Step 4 を 🟡→✅。実施ログに追記。 |

---

## Step 5 ⬜: 認証済みエリアで DashboardLayout とダッシュボード・予約等のルートを組み込む

| 項目 | 内容 |
|------|------|
| **目的** | 認証済み時に、DashboardLayout でラップした上で /dashboard（DashboardPage）、/bookings、/customers 等を表示する。URL は /admin/dashboard のみ必須で、他は既存の予約・顧客・メニュー・リソース・設定の画面があれば同じ Layout 内でルート定義。 |
| **変更対象** | App.tsx の Route 構造。ProtectedRoute の element を DashboardLayout とし、その中で Outlet または Route のネストで /dashboard → DashboardPage、/bookings → BookingsPage 等を割り当てる。既存の DashboardLayout が /dashboard のみ想定している場合は、子ルートで /dashboard のとき DashboardPage を表示。**UI は MUI で実装する。** Step 5 以降は **MUI ThemeProvider が適用済みであることを前提とする**（ADMIN_MUI_MIGRATION_PLAN Phase 0 完了必須）。 |
| **完了条件** | ログイン後 `/admin/dashboard` で、DashboardLayout（サイドバー・ヘッダー）と DashboardPage の内容が同時に表示される（Yes/No）。サイドバーから「予約管理」等をクリックすると対応 URL に遷移する（既存画面がある場合）（Yes/No）。 |
| **手動テスト** | ログイン → /admin/dashboard を開く。Layout とダッシュボード本文が表示される。ナビの「予約管理」等をクリックし、既存の予約画面等に遷移することを確認。 |
| **ドキュメント更新** | 本計画書 Step 5 を 🟡→✅。実施ログに追記。STATUS.md の「2.4 管理画面」に「認証後 Layout + ダッシュボード表示」を追記してもよい。 |

---

## Step 6 ⬜: サイドナビの「設定」を canManageSettings が true のときのみ表示する

| 項目 | 内容 |
|------|------|
| **目的** | spec 5.4 に従い、owner のみ「設定」メニューを表示する。表示制御のみで、ルーティングは増やさない。 |
| **変更対象** | `resources/js/components/admin/layout/DashboardLayout.tsx`。navigation 配列をそのまま全員に渡すのではなく、useAuthStore の canManageSettings() が false のときは「設定」を除外した配列を渡す。**UI は MUI で実装する。** MUI ThemeProvider 前提（Phase 0 完了済み）。 |
| **完了条件** | owner でログインするとサイドバーに「設定」が表示される（Yes/No）。manager または staff または reception でログインすると「設定」が表示されない（Yes/No）。 |
| **手動テスト** | owner のユーザーでログイン → 設定が表示される。別のロールのユーザーでログイン → 設定が表示されない。 |
| **ドキュメント更新** | Fit&Gap「B. ロール」の「表示制御（設定メニュー）」を **未実装→実装済** に更新。本計画書 Step 6 を 🟡→✅。実施ログに追記。 |

---

## ダッシュボードデータ取得の設計（API 一元化）

DashboardPage は **初回マウント時に 1 回のみ** 予約 API を呼び出す（今日＋直近数日分を取得する 1 リクエスト）。取得データを state に保持し、各ブロック（要対応・今日の予約タイムライン・直近の変更・キャンセル）は **その state を加工して表示** する。

> **API 一元化ルール**  
> - DashboardPage は初回マウント時に 1 回のみ予約 API を呼び出す。  
> - 各ブロックは同一 state を参照して表示を構築する。  
> - ブロック単位での追加 API 呼び出しは **禁止** する。

パフォーマンス最適化や将来の API 分割は MVP では行わない。

---

## Step 7 ✅: 今日の予約タイムラインを API 接続し、次の予約を強調する

| 項目 | 内容 |
|------|------|
| **目的** | 上記「API 一元化」に従い、初回マウント時の **1 回の API 呼び出し** で取得したデータのうち「今日の予約」をタイムライン表示し、現在時刻から見て直近の未完了予約を視覚的に強調する。 |
| **変更対象** | `resources/js/pages/admin/dashboard/DashboardPage.tsx`。初回マウント時に 1 回だけ予約 API（今日＋直近数日分、既存 GET /api/v1/bookings の date/範囲で取得）を呼び、state に格納。取得範囲は「今日を含む前後 3 日（計 7 日間）」を上限とする。仕様に明記されていない期間拡張は行わない。将来拡張の検討はしない（MVP では扱わない）。表示部分で「今日の予約」をその state から抽出して時間軸で並べ、現在時刻以降で最も早い予約に「次の予約」を付与。各予約から予約詳細・予約管理への導線を付与。**ブロック単位の追加 API は呼ばない。** **UI は MUI で実装する**（Card / Typography / Stack / List 等）。MUI ThemeProvider 前提。 |
| **完了条件** | 本日に予約が存在する店舗でログインしダッシュボードを開くと、今日の予約が（1 回の取得で得た state から）表示される（Yes/No）。「次の予約」が何らかの形で強調されている（Yes/No）。予約をクリックすると予約管理画面等に遷移する（Yes/No）。 |
| **手動テスト** | 本日の予約が 1 件以上ある store_id でログイン → ダッシュボードに今日の予約が表示される。次の予約が強調表示される。クリックで予約画面へ。 |
| **ドキュメント更新** | Fit&Gap「C. ダッシュボード必須 3 ブロック」の「今日の予約タイムライン」を **一部→実装済** に更新。本計画書 Step 7 を 🟡→✅。実施ログに追記。 |

**Step 7 実装メモ（必須3ブロック UI 先行）**

- **実装ファイル**: `backend/resources/js/pages/admin/dashboard/DashboardPage.tsx`
- **実装内容**: 必須3ブロック（今日の予約タイムライン・要対応アクション・直近の変更・キャンセル）を MUI のみで表示。Container / Grid / Card / CardHeader / CardContent / CardActions / Typography / List / ListItem / ListItemText / Alert / Button を使用。Tailwind の className は新規追加していない。
- **データ**: 仮データ（dummyTodayBookings, dummyActionItems, dummyRecentChanges）。型は API 連携時にそのまま差し替え可能（TodayBookingItem, ActionItem, RecentChangeItem）。
- **レスポンシブ**: Grid で xs=12 md=4（sm 以下は 1 列縦積み、md 以上は 3 列）。
- **テスト観点**: /admin/dashboard で表示崩れなし、画面幅変更で 3 ブロックが自然に並ぶ、Console エラーなし、Tailwind 新規追加なし。API 接続・「次の予約」強調は Step 7 後続で対応可。

---

## Step 8 ✅: 要対応アクションブロックを実装する（API一元化）

| 項目 | 内容 |
|------|------|
| **目的** | spec 5.5 の例外条件に該当する予約をフロントで判定し、「要対応アクション」ブロックにリスト表示する。1 件ごとに該当予約の詳細・編集への導線を付与。0 件のときは「要対応はありません」等と表示。**データは Step 7 で取得した同一 state を加工して使用し、追加 API は呼ばない。** |
| **変更対象** | DashboardPage。初回マウント時に 1 回取得した予約データ（state）を、**仕様書 admin_auth_and_role_dashboard_spec_v1.2.1.md の 5.5 に記載されている例外条件のみ** でフロントフィルタ。該当件数を「要対応件数」として保持。ブロック UI を追加し、リスト表示と導線を実装。**UI は MUI で実装する**（Alert / List / Card 等）。MUI ThemeProvider 前提。 |
| **例外条件の固定（暴走防止）** | (1) 例外条件は **仕様書に記載されている条件のみ** 実装する。(2) 閾値（N 時間など）は **仕様に書かれている値をそのまま** 使用する。(3) 仕様に記載がない例外は実装しない。(4) 「より良い例外」「改善提案」は禁止（MVP では扱わない）。 |
| **完了条件** | 例外条件に 1 件以上該当するデータがある場合、ダッシュボードに「要対応アクション」ブロックが表示され、該当予約がリストされる（Yes/No）。各項目をクリックすると該当予約の詳細または予約管理に遷移する（Yes/No）。0 件のときは「要対応はありません」等が表示される（Yes/No）。 |
| **手動テスト** | 本日に pending の予約がある store でログイン → 要対応にその予約が載る。該当なしの store → 「要対応はありません」。クリックで予約詳細へ。 |
| **ドキュメント更新** | Fit&Gap「C. ダッシュボード必須 3 ブロック」の「要対応アクション」を **未実装→実装済** に更新。本計画書 Step 8 を 🟡→✅。実施ログに追記。 |

**例外条件の明文化**: 例外条件は仕様書の定義のみ使用する。未定義の例外・改善提案は実装しない。条件の数値は仕様書を正とする。

**Step 8 実装メモ（API一元化）**

- **実装ファイル**: `backend/resources/js/pages/admin/dashboard/DashboardPage.tsx`、`backend/app/Http/Controllers/Api/BookingController.php`、`backend/app/Services/BookingService.php`
- **API**: 既存 `GET /api/v1/bookings` に `date_from` / `date_to` を追加。今日含む前後3日（計7日間）を 1 回で取得。DashboardPage は初回マウントで `bookingApi.getList({ date_from, date_to, per_page: 100 })` を 1 回のみ呼び、取得データを state に格納し、今日の予約・要対応・直近変更の 3 ブロックにマッピングして表示。
- **ローディング**: MUI Skeleton。失敗時: MUI Alert（warning）、表示は空。
- **要対応**: 仕様 5.5 の「本日予約が未確定のまま」（本日かつ status=pending）をフロントでフィルタ。直近変更: status=cancelled を updated_at 降順で最大10件。
- **テスト観点**: /admin/dashboard で API 取得→3ブロックに反映、失敗時も画面が壊れない、Console error なし。

---

## Step 9 ✅: 今日の予約タイムラインで「次の予約」を強調表示

| 項目 | 内容 |
|------|------|
| **目的** | 管理者がダッシュボードを開いた瞬間に「次の予約」が一目で分かるようにする。 |
| **変更対象** | DashboardPage。今日の予約のうち、開始時刻が現在時刻以降で最も早い1件を「次の予約」とし、Chip（label=次）・背景・fontWeight で強調。次の予約をリスト先頭に表示。 |
| **判定ロジック** | 開始時刻（HH:mm）を分に変換し、現在時刻以降のもののうち最小の1件。すべて過去なら強調なし。 |
| **完了条件** | 今日の予約がある場合、現在時刻に応じて next が切り替わる。予約0件は従来どおり。Console error なし。 |

**Step 9 実装メモ**

- **実装ファイル**: `backend/resources/js/pages/admin/dashboard/DashboardPage.tsx`
- **次の予約判定**: `getNextBookingId` — 現在時刻（分）以降の start_time のうち最も早い1件。`orderTodayBookingsWithNextFirst` で next を先頭に並べ替え。
- **UI強調**: MUI Chip（label="次" color="primary"）、ListItem の sx（bgcolor: action.selected、左ボーダー primary）、Typography fontWeight 600。
- **テスト観点**: 今日の予約がある場合に next が切り替わる、0件で崩れない、Console error なし。

---

## Step 10 ✅: 直近の変更・キャンセルの表示を強化する（MUI）

| 項目 | 内容 |
|------|------|
| **目的** | 「直近の変更・キャンセル」ブロックの情報量を増やし、現場が状況を素早く把握できるようにする。 |
| **変更対象** | DashboardPage。ListItem の primary に顧客名＋Chip（キャンセル/変更）。secondary に更新日時（YYYY-MM-DD HH:mm）＋予約日（booking_date）＋任意で相対表示（x時間前）。0件時は現状維持。データは cancelled のみ（type フィールドは将来拡張用に活用）。 |
| **完了条件** | /admin/dashboard で表示崩れなし。直近0件でも崩れない。Console error なし。 |

**Step 10 実装メモ**

- **実装ファイル**: `backend/resources/js/pages/admin/dashboard/DashboardPage.tsx`
- **表示強化**: RecentChangeItem に booking_date を追加。primary＝顧客名＋MUI Chip（キャンセル=error outlined）。secondary＝formatUpdatedAt（YYYY-MM-DD HH:mm）＋formatRelativeShort（24時間以内は「x時間前」）＋「 · 予約日 {booking_date}」。0件時は「直近の変更はありません。」のまま。
- **テスト観点**: 表示崩れなし、0件時も崩れない、Console error なし。

---

## Step 11 ✅: 要対応アクションを拡張可能にし、表示を完成させる（MUI）

| 項目 | 内容 |
|------|------|
| **目的** | 要対応アクションブロックを、現仕様を満たしつつ将来アクション種別を追加しやすい構造に整える。 |
| **変更対象** | ActionItem に type（pending_today 等）・severity（info/warning/error）・link を追加。mapToActionItems で link 付与。0件時は Alert success 維持。1件以上は顧客名＋理由＋Chip「未確定」。CardActions「予約管理へ」は link で遷移。 |
| **完了条件** | 0件でも崩れない。1件以上で List 表示。予約管理へリンクが正しい。Console error なし。 |

**Step 11 実装メモ**

- **実装ファイル**: `backend/resources/js/pages/admin/dashboard/DashboardPage.tsx`
- **ActionItem 型**: ActionItemType（pending_today）、ActionItemSeverity（info/warning/error）、link: string を追加。mapToActionItems で type: 'pending_today'、severity: 'warning'、link: BOOKINGS_LINK（'/bookings'）を付与。
- **表示**: 0件＝Alert success「要対応はありません」。1件以上＝顧客名＋Chip「未確定」（warning outlined）、secondary に理由・予約番号・時刻。CardActions は actionItems[0].link で navigate。
- **テスト観点**: 0件で崩れない、1件以上で List、予約管理へが正しい、Console error なし。

---

## Step 12 ✅: ひとことメッセージを実装する（固定文＋条件分岐 A→B→C）

| 項目 | 内容 |
|------|------|
| **目的** | ダッシュボード最上段に、仕様 5.2 に従った「ひとことメッセージ」を 1 文（最大 2 行）で表示する。入力データは今日の予約件数・要対応件数・次の予約時刻（取得できれば）。優先順位 A（要対応≥1）→ B（今日 0 件）→ C（要対応 0 かつ今日≥1）で固定文を選択。フォールバックは今日件数・要対応件数のみで成立させる。 |
| **変更対象** | DashboardPage の最上段に、ひとことメッセージ用のコンポーネントまたはインライン表示を追加。Step 7・8 で取得した「今日の予約件数」「要対応件数」「次の予約時刻」を渡し、ルール A→B→C の順で判定して固定文を表示。要対応 > 0 のときは注意状態（クラスや data 属性で UI に委ねる）。**UI は MUI で実装する**（Typography / Alert 等）。MUI ThemeProvider 前提。 |
| **完了条件** | 要対応が 1 件以上のとき、ルール A の文言（例「今日は ○ 件、確認が必要です」）が表示される（Yes/No）。今日の予約が 0 件のとき、ルール B の文言が表示される（Yes/No）。要対応 0 かつ今日 1 件以上のとき、ルール C の文言が表示される（Yes/No）。文言が 1 文・句読点少なめ・命令調でない（Yes/No）。 |
| **手動テスト** | 要対応 1 件以上 → A 文言。今日 0 件 → B 文言。それ以外 → C 文言。0 件のときポジティブな言い回しになっているか。要対応 > 0 で注意状態の見た目になるか（色等は UI 任せ）。 |
| **ドキュメント更新** | Fit&Gap「D. ひとことメッセージ」の該当行を **未実装→実装済** に更新。本計画書 Step 12 を 🟡→✅。実施ログに追記。STATUS.md に「管理画面 認証・ダッシュボード（相棒ひとこと） spec v1.2.1 準拠」を追記。 |

**Step 12 実装メモ**

- **実装ファイル**: `backend/resources/js/pages/admin/dashboard/DashboardPage.tsx`
- **ひとこと生成**: `getOneLineMessage(todayBookings, actionItems, nextBookingId)` → `{ severity, message }`。優先順位: 要対応 > 0 → warning「今日は ○ 件、確認が必要です。」／今日 0 件 → info「今日は予約がありません。落ち着いて準備できそうです。」／次の予約あり → info「次の予約は HH:mm です。」／それ以外 → success「今日もよろしくお願いします。」
- **表示**: Container 直下に MUI Alert（severity 可変、variant=outlined）。ローディング中・エラー時はひとことは出さない（エラー時は既存の warning Alert のみ）。
- **テスト観点**: 予約0件で info、要対応ありで warning、Console error なし。

---

## 実施ログ（各ステップ完了時に追記）

ステータス凡例: ⬜ 未実施 / 🟡 実施中 / ✅ 完了

| Step | 実施日 | 変更ファイル（例） | サマリー |
|------|--------|---------------------|----------|
| 1 | 2025-02-11 | App.tsx, ADMIN_DASHBOARD_FIT_GAP_v1.2.1.md, STATUS.md, 本計画書 | BrowserRouter basename=/admin、Route /login→LoginPage・/dashboard→DashboardPage、/→Navigate /login。手動テスト: /admin/login でログイン表示・ログイン成功で /admin/dashboard 表示を確認。 |
| 2 | 2025-02-11 | ProtectedRoute.tsx, App.tsx, Fit&Gap, STATUS, 本計画書 | ProtectedRoute で isAuthenticated/token 判定、未認証時 Navigate to=/login state.from。/dashboard を ProtectedRoute でラップ。手動テスト: 未ログインで /admin/dashboard → /admin/login に飛ぶ。 |
| 3 | — | — | 未実施 |
| 4 | — | — | 未実施 |
| 5 | — | — | 未実施 |
| 6 | — | — | 未実施 |
| 7 | 2026-02-11 | DashboardPage.tsx, 本計画書, STATUS.md | 必須3ブロックを MUI で実装（今日の予約・要対応アクション・直近の変更・キャンセル）。仮データで表示。Container/Grid/Card/List/Alert。Tailwind 新規追加なし。テスト: /admin/dashboard 表示・レスポンシブ・Console エラーなし。 |
| 8 | 2026-02-11 | DashboardPage.tsx, BookingController.php, BookingService.php, 本計画書, Fit&Gap, STATUS.md | API一元化: 予約APIに date_from/date_to 追加。DashboardPage は初回1回 getList で取得→今日の予約・要対応・直近変更にマッピング。ローディング=Skeleton、失敗=Alert。要対応は本日 pending のみ。 |
| 9 | 2026-02-11 | DashboardPage.tsx, 本計画書, Fit&Gap, STATUS.md | 今日の予約で「次の予約」を強調。開始時刻≥現在で最も早い1件をChip・背景・先頭表示。getNextBookingId / orderTodayBookingsWithNextFirst。 |
| 10 | 2026-02-11 | DashboardPage.tsx, 本計画書, Fit&Gap, STATUS.md | 直近の変更・キャンセル表示強化。顧客名＋Chip（キャンセル/変更）、secondary に更新日時・予約日・相対表示。RecentChangeItem に booking_date 追加。 |
| 11 | 2026-02-11 | DashboardPage.tsx, 本計画書, Fit&Gap, STATUS.md | 要対応アクション拡張。ActionItem に type/severity/link 追加。Chip「未確定」、CardActions は link で遷移。BOOKINGS_LINK=/bookings。 |
| 12 | 2026-02-11 | DashboardPage.tsx, 本計画書, Fit&Gap, STATUS.md | ひとことメッセージ追加。getOneLineMessage（要対応→warning／今日0件→info／次の予約→info／else→success）。Container直下に MUI Alert。ローディング・エラー時は非表示。 |

---

## ステップ完了時の更新手順（共通）

1. **ADMIN_DASHBOARD_FIT_GAP_v1.2.1.md**  
   該当する観点の判定を「未実装」→「実装済」、「一部」→「実装済」に変更。根拠に「〇〇を実装。ファイル X の Y 行付近」を追記。
2. **STATUS.md**  
   該当セクション（例: 2.4 管理画面）に、完了した機能を 1 行で追記。必要に応じて「次にやること」から削除または更新。
3. **ADMIN_DASHBOARD_IMPLEMENTATION_PLAN_v1.2.1.md**  
   該当 Step の表の左または見出しに ✅ を付与（🟡→✅）。実施ログに実施日・変更ファイル・サマリーを 1 行追記。

---

## 最初に着手すべき Step（理由付き）

**Step 1: SPA に React Router を導入し /login と /dashboard を定義する**

**理由**: 現状、App.tsx が静的な「統合完了」ページのみを表示しており、LoginPage も DashboardPage もルーティングで表示されていない。認証フロー（未認証→/login、認証済み→/dashboard）も、ルートガード（Step 2）も、Layout とダッシュボードの表示（Step 5）も、すべて「Router で /login と /dashboard が存在する」ことが前提となる。そのため、**まず Step 1 で Router と 2 つのルートを定義し、/admin/login でログイン画面、/admin/dashboard でダッシュボードが表示される状態にする**ことが、以降の全ステップの前提となる。Step 1 を完了してから Step 2〜10 を順に実施する。

---

---

## 変更履歴

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.1 | 2026-02-11 18:13 | 初版（Step 1〜10、API 一元化・例外条件固定）。 | tugilo inc. |
| 1.2 | 2026-02-11 18:30 | MUI 移行計画との整合追記。ルール（Phase 0 先行・Step 3〜10 は MUI・置換は Phase 1〜3）追加。Step 3〜10 に UI 方針・ThemeProvider 前提を明記。 | tugilo inc. |
| 1.2.1 | 2026-02-11 21:45 | Step 7 完了。必須3ブロックを MUI で実装（DashboardPage.tsx）。仮データ・API 差し替え可能な型。実施ログ・テスト観点を追記。 | tugilo inc. |
| 1.2.2 | 2026-02-11 22:15 | Step 8 完了。API一元化（bookings に date_from/date_to、DashboardPage で1回取得→3ブロック反映）。要対応は本日 pending、直近変更は cancelled。 | tugilo inc. |
| 1.2.3 | 2026-02-11 21:11 | Step 9 完了。今日の予約で「次の予約」を強調（開始時刻≥現在で最も早い1件を Chip・背景・先頭表示）。getNextBookingId / orderTodayBookingsWithNextFirst。 | tugilo inc. |
| 1.2.4 | 2026-02-11 21:15 | Step 10 完了。直近の変更・キャンセル表示強化（顧客名＋Chip、更新日時・予約日・相対表示、booking_date 追加）。 | tugilo inc. |
| 1.2.5 | 2026-02-11 21:19 | Step 11 完了。要対応アクションを拡張可能に（ActionItem に type/severity/link、Chip「未確定」、予約管理へ link）。 | tugilo inc. |
| 1.2.6 | 2026-02-11 21:24 | Step 12 完了。ひとことメッセージを追加（getOneLineMessage、Container直下 MUI Alert、ローディング・エラー時は非表示）。ダッシュボード完了。 | tugilo inc. |
| 1.2.2 | 2026-02-12 01:00 | 導線復旧。ルールに「導線は AdminShell で提供、ダッシュボード単体ではメニューを持たない」を追記。 | tugilo inc. |

---

**以上、実装計画 v1.2.1 とする。MVP_EXECUTION_RULES に従い、各ステップ完了時に必ず Fit&Gap・STATUS・本計画書を更新すること。**
