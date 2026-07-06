# 管理画面「メニュー管理」実装棚卸し v1.0

**Version**: 1.1  
**作成日**: 2026-02-12 00:30  
**更新日**: 2026-07-06 16:50:15  
**目的**: MenusPage を中心にメニュー管理の現状実装を把握し、DataGrid PoC の適否判断に必要な材料を揃える。実装変更は行わない。  
**関連**: `ADMIN_LIST_UI_DATAGRID_EVALUATION_v1.0.md`、`ADMIN_MUI_MIGRATION_PLAN_v1.0.md` Phase 5  
**実行順序**: **#16 UI-P5-POC**（`REMAINING_TASKS_PLAN_v1.0.md` §4）。前提: **#15 UI-FIX-01**

---

## 1. 概要（目的 / 対象 / 結論）

### 1.1 目的

- メニュー管理の「画面フロー」「UI 構造」「API」「モーダル仕様」をコードベースから棚卸しする。
- 一覧を MUI DataGrid 化した場合の難所・不足・最小 PoC 案を先に洗い出し、PoC 実施の判断に使う。

### 1.2 調査対象

| 種別 | パス |
|------|------|
| 一覧ページ | `backend/resources/js/pages/admin/menus/MenusPage.tsx` |
| 作成モーダル | `backend/resources/js/components/admin/menus/MenuCreateModal.tsx` |
| 編集モーダル | `backend/resources/js/components/admin/menus/MenuEditModal.tsx` |
| 詳細モーダル | `backend/resources/js/components/admin/menus/MenuDetailModal.tsx` |
| API クライアント | `backend/resources/js/services/api.ts`（`menuApi` / `apiClient.getMenus` 等） |
| バックエンド | `backend/app/Http/Controllers/Api/MenuController.php` |
| ルーティング | `backend/routes/api.php`（`Route::apiResource('menus', MenuController::class)` 等） |

### 1.3 結論（要約）

- 一覧は **grid（カード）** と **list（`<table>`）** の表示切替があり、サーバページング・検索・カテゴリ・ステータスフィルタを利用している。
- ソートは **API のみ**（`sort_by` / `sort_order`）で、**一覧 UI にソート操作はない**。
- 作成/編集モーダルは **FormField（MUI TextField 互換ラッパー）** と **AppButton** を使用。保存後は `onSuccess` で一覧再取得とモーダル閉じ。
- DataGrid PoC に適しているのは **list ビューのみ** を DataGrid に差し替える案。API はページング・フィルタ・ソートをすでに受け付けており、列定義も既存テーブルと対応付けやすい。grid 表示は現状維持を推奨。

---

## 2. 画面フロー

### 2.1 一覧表示 → 新規作成 → 保存後

- **一覧**: MenusPage で「新規メニュー」ボタン（`setShowCreateModal(true)`）をクリック。
- **作成モーダル**: MenuCreateModal が開く。フォーム入力後「メニューを作成」で `handleSubmit` → `validateForm()` → `menuApi.create(formData)`。成功時は `addNotification`（success）、`onSuccess()`、`handleClose()`。  
  **根拠**: `MenuCreateModal.tsx` の `handleSubmit`（L167〜206）、`onSuccess` は MenusPage で `loadMenus(1); setShowCreateModal(false)` を渡している（L415〜418）。
- **保存後の挙動**: モーダルを閉じ、一覧を 1 ページ目で再取得（`loadMenus(1)`）。Toast は `addNotification` で表示。

### 2.2 一覧表示 → 編集 → 保存後

- **一覧**: grid の「編集」または list の「編集」から `handleEditMenu(menu)` → `setEditingMenuId(menu.id); setShowEditModal(true)`。
- **編集モーダル**: MenuEditModal が開き、`menuId` で `menuApi.get(menuId)` を呼んで初期表示。変更後「変更を保存」で `validateForm()` → `hasChanges()` 確認 → 変更分だけ `menuApi.update(menuId, updateData)`。成功時は `addNotification`、`onSuccess()`、`handleClose()`。
- **保存後の挙動**: モーダルを閉じ、**現在のページ**で一覧を再取得（`loadMenus(pagination.current_page)`）。編集モーダルを閉じる前に「変更が保存されていません。閉じてもよろしいですか？」は `confirm()` で確認（`handleCloseWithConfirm`）。  
  **根拠**: `MenuEditModal.tsx` の `handleSubmit`（L206〜266）、`handleCloseWithConfirm`（L279〜286）。MenusPage の `onSuccess`（L434〜438）。

### 2.3 一覧表示 → 削除 → 一覧反映

- **削除導線**: grid/list の「削除」→ `handleDeleteMenu(menu)` → `setDeletingMenu(menu); setShowDeleteDialog(true)`。ConfirmDialog で「削除する」→ `menuApi.delete(deletingMenu.id)`、成功時に `addNotification`、`loadMenus(pagination.current_page)`、ダイアログ閉じ。  
  **根拠**: MenusPage.tsx L448〜469（ConfirmDialog の onConfirm）。

### 2.4 grid / list の表示切替

- **仕様**: `viewMode` が `'grid'` のときはカード grid（`MenuCard`）、`'list'` のときは `<table>` + `MenuTableRow`。切替は「表示切り替え・統計」のアイコンボタン（Squares2X2Icon = grid、ListBulletIcon = list）。初期値は `useState<'grid' | 'list'>('grid')`。  
  **根拠**: MenusPage.tsx L42、L278〜299、L323〜377。

---

## 3. MenusPage の UI 構造（grid / list / 操作）

### 3.1 表示形式

| モード | 実装 | 条件 |
|--------|------|------|
| **grid** | `div.grid` + `MenuCard`（Card + Card.Body） | `viewMode === 'grid'`（初期値） |
| **list** | `Card` 内の `<table>` + `MenuTableRow` | `viewMode === 'list'` |

### 3.2 表示項目

- **grid（MenuCard）**: display_name、非アクティブ/要承認バッジ、category、description（line-clamp-2）、formatted_price、formatted_total_duration、options_count。操作ボタンは「詳細」「編集」「削除」。  
  **根拠**: MenusPage.tsx L414〜434（MenuCard 内）。
- **list（MenuTableRow）**: 列は「メニュー」（display_name + description）、「カテゴリ」、「料金・時間」（formatted_price + formatted_total_duration）、「ステータス」（is_active / requires_approval）、「オプション」（options_count）、「操作」（詳細・編集・削除）。  
  **根拠**: MenusPage.tsx L337〜361（thead）、L438〜453（MenuTableRow）。

### 3.3 操作（検索・フィルタ・並び順・ページング）

| 項目 | 内容 | 根拠 |
|------|------|------|
| 検索 | テキスト入力（placeholder: メニュー名で検索）。Enter または「検索」ボタンで `handleSearch()` → `loadMenus(1)`。 | L206〜222 |
| カテゴリ | 「フィルター」展開時に select。`categories?.categories` を options に使用。`selectedCategory` を API に渡す。 | L234〜253、L80 |
| ステータス | 「フィルター」展開時に select（すべて / アクティブ / 非アクティブ）。`selectedStatus` → `is_active` で API に渡す。 | L254〜267、L81 |
| 並び順 | **一覧 UI 上にはソート操作なし**。API は `sort_by` / `sort_order` を受け付ける（後述）。 | — |
| ページング | サーバページング。`pagination.last_page > 1` のとき「前へ」「次へ」で `handlePageChange` → `loadMenus(page)`。 | L379〜406 |
| 一覧更新 | **明示的「更新」ボタンはなし**。作成/編集/削除の `onSuccess` で `loadMenus` を呼んで再取得。初回は `useEffect` で `loadMenus()` と `loadCategories()`。 | L64〜66、L415〜418、L434〜438、L464 |

### 3.4 依存 UI コンポーネント

| コンポーネント | 使用箇所 | 備考 |
|----------------|----------|------|
| Card | 検索エリア、空状態、list のテーブル枠、MenuCard 内 | 自作 `components/ui/Card`（Tailwind） |
| Button | 新規メニュー、検索、フィルター、リセット、表示切替、空状態の作成、MenuCard/MenuTableRow の詳細・編集・削除、ページネーション | 自作 `components/ui/Button`（**AppButton は未使用**） |
| LoadingScreen | 初回 `loading && menus.length === 0` のとき | `components/ui/LoadingScreen` |
| Modal | 作成・編集・詳細は各モーダル内で使用 | `components/modal/Modal`（MUI Dialog ラッパー） |
| ConfirmDialog | 削除確認 | `components/ui/ConfirmDialog`（MUI Dialog） |
| Heroicons | PlusIcon, MagnifyingGlassIcon, FunnelIcon, Squares2X2Icon, ListBulletIcon, PencilIcon, TrashIcon, EyeIcon, TagIcon, CurrencyYenIcon, ClockIcon | @heroicons/react/24/outline |

※ MenusPage 自体は **Button**（自作）を使用しており、AppButton には未置換。MenuCreateModal / MenuEditModal は **AppButton** と **FormField**（MUI TextField 互換）を使用。

---

## 4. API 仕様（エンドポイント / params / レスポンス）

### 4.1 一覧取得

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /menus`（api.php の `apiResource('menus', MenuController::class)` により index） |
| クライアント | `menuApi.getList(filters)` → `apiClient.getMenus(filters)`（api.ts L1135、L689〜725） |
| params（フロントから送信） | `page`, `per_page`（pagination.per_page、初期 20）, `search`, `category`, `is_active`（true/false、選択時のみ） |
| params（API が受け付けるもの） | 上記に加え、`min_price`, `max_price`, `min_duration`, `max_duration`, `sort_by`（既定 `sort_order`）, `sort_order`（既定 `asc`）。`per_page` は最大 100 まで（Controller L85）。 |
| 返却形式 | `{ success, data: { menus: Menu[], pagination: { current_page, last_page, per_page, total } } }`。フロントは `response.menus` と `response.pagination` をそのまま利用。from/to はフロントで計算（MenusPage L92〜94）。 |
| ページング方式 | **サーバ**。`loadMenus(page)` で page を渡し、API が paginate した結果を返す。 |
| ソート | **API のみ**。Controller は `sort_by` / `sort_order` を受け取り、`ordered()` または `orderBy($sortBy, $sortOrder)` を適用。**一覧 UI にソート操作はない**。 |

**注意（バックエンド）**: MenuController の index では、クエリ開始時に `->where('is_active', true)` が固定でかかっている（L36〜40）。その後に `$request->filled('is_active')` で `where('is_active', $request->boolean('is_active'))` を追加するため、**「非アクティブ」を選んだ場合は条件が矛盾し、0 件になる**。非アクティブ一覧を出すには、バックエンドで `is_active` の既定スコープを見直す必要がある。  
**根拠**: MenuController.php L36〜57。

### 4.2 詳細取得・作成・更新・削除・カテゴリ・並び順

| 用途 | メソッド | エンドポイント | 備考 |
|------|----------|----------------|------|
| 詳細 | menuApi.get(id) | GET /menus/:id | 編集・詳細モーダルの初期データ |
| 作成 | menuApi.create(data) | POST /menus | CreateMenuRequest |
| 更新 | menuApi.update(id, data) | PUT /menus/:id | UpdateMenuRequest（変更分のみ） |
| 削除 | menuApi.delete(id) | DELETE /menus/:id | 予約履歴ありなら 422 |
| カテゴリ | menuApi.getCategories() | GET /menus-categories | フィルタの select 用 |
| 並び順 | menuApi.updateOrder(menuOrders) | PATCH /menus-order | フロントの MenusPage では未使用 |

---

## 5. モーダル（作成 / 編集 / 詳細）

### 5.1 作成モーダル（MenuCreateModal）

- **入力項目**: メニュー名（必須）、表示名（必須）、カテゴリ（必須・select）、説明（任意・textarea）、基本料金（必須・number）、基本時間（必須・number）、準備時間・片付け時間（任意・number）、事前予約時間（number）、性別制限（select）、is_active（checkbox）、requires_approval（checkbox）、sort_order（number）。  
  **根拠**: MenuCreateModal.tsx の FormField 並びと validateForm（L100〜165）。
- **FormField**: すべて FormField（MUI TextField 互換ラッパー）。type=text/select/textarea/number、error/required を渡している。FormField から MUI TextField に変わった影響は、見た目・helperText の統一のみで、props（value/onChange/error 等）は互換のため型・挙動は維持。
- **バリデーション**: クライアントで `validateForm()`（必須・数値範囲・総所要時間 24 時間以内）。API エラー時は `error.response?.data?.error?.details` を `setErrors` にセット。
- **成功時**: `addNotification`（success）、`onSuccess()`（MenusPage で `loadMenus(1); setShowCreateModal(false)`）、`handleClose()`（フォームリセット＋onClose）。

### 5.2 編集モーダル（MenuEditModal）

- **入力項目**: 作成と同様の項目。`menuId` で `menuApi.get(menuId)` を取得し、formData を初期化。変更があった項目だけ `menuApi.update(menuId, updateData)` で送信。
- **FormField**: 同上（FormField = MUI TextField 互換）。編集も同じく value/onChange/error で問題なし。
- **バリデーション**: 作成と同様のルール。加えて `hasChanges()` が false の場合は「変更なし」で送信しない。
- **成功時**: `addNotification`、`onSuccess()`（`loadMenus(pagination.current_page)`＋モーダル閉じ）、`handleClose()`。閉じる時に未保存変更があれば `confirm()` で確認。

### 5.3 詳細モーダル（MenuDetailModal）

- **表示のみ**: ステータス（is_active / requires_approval）、基本情報（name, display_name, category, sort_order）、説明、料金・時間詳細、オプション一覧、統計（bookings_count / options_count）、メタ情報。編集は「編集」ボタンで `onEdit(menu.id)` を呼び、詳細を閉じて編集モーダルを開く。  
  **根拠**: MenuDetailModal.tsx L98〜351。Button は自作 `../ui/Button`（AppButton 未使用）。

---

## 6. DataGrid 化の適合性評価（難所 / 不足 / 最小 PoC 案）

### 6.1 難所・注意点

- **バックエンドの is_active スコープ**: 一覧 API が常に `is_active = true` でスコープしているため、「非アクティブ」フィルタが 0 件になる。DataGrid でフィルタをそのまま使う場合は、API のスコープ修正が必要。
- **grid と list の併存**: ユーザーは grid/list を切替えている。DataGrid は表形式のため **list ビューのみ** を DataGrid に差し替える形が自然。grid は現状の MenuCard のまま残すと、導線・期待動作を変えずに済む。
- **行クリック導線**: 現状 list では行クリックはなく、「詳細」「編集」「削除」ボタンのみ。DataGrid では行クリックで詳細または編集を開くようにするか、アクション列でボタンを並べるかを決める必要がある。既存の「詳細→編集」の流れを維持するなら、行クリック＝詳細モーダル、列に「編集」「削除」を並べる形がよい。
- **MenusPage の Button**: 一覧まわりのボタンはまだ自作 Button。DataGrid 導入と同時に AppButton に揃えるかは別タスクとしてよい。

### 6.2 API の不足

- **ソート**: API は `sort_by` / `sort_order` に対応済み。DataGrid の列ヘッダーソートと接続するだけなので不足なし。
- **ページング**: サーバページング済み。DataGrid の pageSize / page と `loadMenus(page)` を紐付ければ足りる。
- **検索・フィルタ**: search / category / is_active を送信済み。DataGrid のフィルタ UI をどうするか（ツールバーを残して現状の検索・select をそのまま使うか、DataGrid の column filter に寄せるか）は設計次第。最小 PoC ではツールバーを残して既存 params をそのまま渡すのが安全。

### 6.3 列（columns）の対応

list の既存列と DataGrid の columns の対応は次のとおり。

| 既存列 | データフィールド | 備考 |
|--------|------------------|------|
| メニュー | display_name（＋ description は renderCell でサブ表示可） | — |
| カテゴリ | category | — |
| 料金・時間 | formatted_price / formatted_total_duration | 2 列にするか 1 列にまとめるか |
| ステータス | is_active, requires_approval | renderCell で Chip 表示 |
| オプション | options_count | — |
| 操作 | アクション列 | 詳細・編集・削除ボタン（または行クリックで詳細） |

### 6.4 最小 PoC 案

- **対象**: **MenusPage の list ビューのみ** を MUI DataGrid（Community）に差し替える。
- **維持するもの**: grid 表示（MenuCard）、検索・カテゴリ・ステータス・ページングの仕様、`loadMenus(page)` と同一の API 呼び出し、作成・編集・削除・詳細のモーダルとフロー。
- **変更するもの**: `viewMode === 'list'` のとき、`<table>` + MenuTableRow の代わりに `<DataGrid rows={menus} columns={...} />` を表示。ページングは DataGrid の paginationMode="server" と rowCount / page / onPaginationModelChange で `loadMenus(page)` に接続。ソートは column の sortable と API の sort_by / sort_order を接続（オプション）。  
- **行クリック**: 行クリックで詳細モーダルを開くようにすると、既存の「詳細」ボタンと役割が揃う。編集・削除はアクション列に残す。

### 6.5 PoC するならどこから（1 案）

**list ビューのみを DataGrid に差し替える。**

- 既存の list が `<table>` であり、表示項目・操作が明確なため、columns / rows の対応がしやすい。
- すでにサーバページング・検索・フィルタを利用しており、API を変えずに DataGrid の props に載せられる。
- grid はそのままにすることで、ユーザー体験の変化を list だけに限定でき、PoC の評価がしやすい。
- 実装手順案: (1) `@mui/x-data-grid` を利用可能にする（未導入なら追加）。 (2) MenusPage 内に `MenuListDataGrid` のような子コンポーネントを作り、`viewMode === 'list'` のときだけ DataGrid を表示。 (3) rows に `menus`、columns に上記の列定義、pagination をサーバモードで loadMenus と接続。 (4) 行クリックで詳細、アクション列で編集・削除。 (5) 既存の検索・フィルター・表示切替 UI はそのまま残す。

---

## 7. 変更履歴

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-12 00:30 | 初版。画面フロー、MenusPage UI、API、モーダル、DataGrid 適合性・最小 PoC 案を記載。 | tugilo inc. |
| 1.1 | 2026-07-06 16:50:15 | 実行順序 #15〜16 との対応を追記。 | tugilo inc. |
