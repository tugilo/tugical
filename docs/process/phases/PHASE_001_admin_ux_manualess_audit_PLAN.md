# PHASE_001_admin_ux_manualess_audit

**作成日時**: 2026-07-18 21:30:51  
**最終更新日時**: 2026-07-18 21:36:11  
**Phase ID**: PHASE_001  
**フェーズ種別**: docs  
**ブランチ**: `feature/phase001-admin-ux-manualess-audit`

---

## 1. 目的

管理画面の機能・UI が「マニュアルなしで誰でも使える」水準かを、**ケース（利用シナリオ）単位**で検証し、問題点を優先順位付きで文書化する。

本 Phase では **コード変更しない**。ローカル Docker コンテナ上の管理画面をブラウザで操作し、観察結果のみを成果物とする。

---

## 2. Related SSOT

| Spec / Doc | 用途 |
|------------|------|
| `docs/admin_auth_and_role_dashboard_requirements_v1.1.md` | 認証・ダッシュボード要件（相棒感・行動導線） |
| `docs/admin_auth_and_role_dashboard_spec_v1.2.1.md` | ダッシュボード仕様 |
| `docs/tugical_ui_design_system_v1.0.md` | UI/UX 設計（タッチ・一貫性） |
| `docs/ADMIN_UI_FIT_GAP_v1.0.md` | UI 技術 Fit&Gap（参考・本 Phase の主対象外） |
| `docs/ADMIN_DASHBOARD_FIT_GAP_v1.2.1.md` | ダッシュボード機能 Fit&Gap |
| `.cursorrules` | 管理画面＝MUI、片手操作、業種特化禁止 |

※ `docs/02_specifications/SSOT_REGISTRY.md` は未整備のため、上記を Related SSOT とする。

---

## 3. Scope

### 変更可能

- `backend/docs/**`（PLAN / WORKLOG / REPORT / 監査成果物 / PHASE_REGISTRY / DOCS_INDEX 追記）
- `backend/docs/process/**`

### 変更禁止

- `app/**` `resources/**` `routes/**` `database/**` `package.json` `composer.json`
- 実装・リファクタ・文言修正の実施（指摘のみ）

---

## 4. 評価基準（マニュアルレス度）

各ケースを次の観点で **Pass / Partial / Fail** 判定する。

| 観点 ID | 観点 | Pass の定義 |
|---------|------|-------------|
| U1 | 初見理解 | 画面名・ラベルだけで「何の画面か」「次に何をするか」が分かる |
| U2 | 主操作到達 | 目標操作まで 3 クリック以内、または画面内の主 CTA が明確 |
| U3 | 空・エラー | 0件・失敗時に「何が起きたか」「次に何をすればよいか」が分かる |
| U4 | 専門用語 | 「リソース」「要対応」等が文脈なしでも誤解しにくい、または補足がある |
| U5 | 破壊操作 | 削除・キャンセル等に確認があり、取り消し/影響が分かる |
| U6 | ロール | 権限外操作が隠されるか、分かりやすく拒否される |

総合判定（画面・ケース単位）:

- **マニュアルレス可**: Fail なし、Partial は軽微のみ
- **補助説明があれば可**: Partial が中心、Fail は致命でない
- **マニュアル必須**: Fail が主操作を阻害

---

## 5. 想定ケース（検証シナリオ）

### Persona

| ID | ペルソナ | 前提 |
|----|----------|------|
| P-owner | 店舗オーナー（初回〜日常） | 設定・マスタ・予約すべて触る |
| P-reception | 受付（電話対応中） | 片手・速さ優先、予約作成・確認が主 |
| P-staff | スタッフ | 自分の予定確認、顧客・予約の閲覧中心 |

### Case 一覧

| Case ID | シナリオ | Persona | 成功条件（DoD 観点） |
|---------|----------|---------|----------------------|
| C01 | 未認証で `/admin` に来る → ログインできる | P-owner | 店舗選択・メール・パスワードの意味が分かる。失敗時メッセージが分かる |
| C02 | ログイン直後、今日やるべきことが分かる | P-owner / P-reception | ダッシュボードで「次の一手」が見える |
| C03 | 電話を受けながら新規予約を入れる | P-reception | 顧客→メニュー→日時→確定の流れが迷わない |
| C04 | 今日の予約一覧・タイムラインで「次の予約」を確認する | P-staff | 時刻・顧客・メニューが一目で分かる |
| C05 | 予約の変更・キャンセルをする | P-reception | 対象特定→操作→確認まで迷わない |
| C06 | 新規顧客を登録する | P-reception | 必須項目・保存後の次アクションが分かる |
| C07 | メニューを追加・編集する | P-owner | 時間・料金の意味、公開/非公開が分かる |
| C08 | リソース（スタッフ・設備）を追加する | P-owner | 「リソース」語彙が業務語に落ちる、またはラベルで補完 |
| C09 | 設定（LINE 等）を開く | P-owner | 何を設定すべきか、未設定時の誘導がある |
| C10 | サイドナビだけで全機能に辿れる | 全員 | ラベル・説明で画面の役割が分かる |
| C11 | データ 0 件時の空状態 | P-owner | 「まだない」＋「どう作るか」が分かる |
| C12 | 権限のない操作（staff/reception） | P-staff | 設定等が隠れる／拒否が明確 |

---

## 6. 検証環境

| 項目 | 値 |
|------|-----|
| 環境 | ローカル Docker（nginx :80） |
| URL | `http://localhost/admin` |
| アカウント | `owner@tugical.test` / `password123` / store_id=1（必要に応じ role 切替） |
| 手段 | cursor-ide-browser による画面操作・スナップショット |

---

## 7. Tasks

| Task | 内容 | 成果 |
|------|------|------|
| T1 | PLAN 確定・ブランチ作成 | 本ファイル |
| T2 | C01〜C12 をブラウザで実施し WORKLOG に判定記録 | WORKLOG |
| T3 | 問題点を優先度付きで成果物ドキュメント化 | `docs/ADMIN_UX_MANUALESS_AUDIT_v1.0.md` |
| T4 | DOCS_INDEX / PHASE_REGISTRY / REPORT 更新 | REPORT・索引 |

---

## 8. DoD（完了条件）

- [x] PLAN にケース・評価基準・Scope が明記されている
- [x] ローカル管理画面で C01〜C12 を実施し、各 Case に Pass/Partial/Fail がある
- [x] 問題点が **P0 / P1 / P2 / P3** で一覧化されている
- [x] 成果物 `ADMIN_UX_MANUALESS_AUDIT_v1.0.md` が存在する
- [x] WORKLOG / REPORT（Merge Evidence 含む）/ PHASE_REGISTRY が更新されている
- [x] コード変更がない（docs のみ）

---

## 9. 優先度定義（成果物で使用）

| 優先度 | 定義 | 目安 |
|--------|------|------|
| P0 | 主業務（電話予約・今日の確認）が止まる／誤解で誤操作 | 即対応候補 |
| P1 | 初見で迷うが代替導線あり。マニュアルレスを阻害 | 早期改善 |
| P2 | 用語・空状態・一貫性。慣れれば使える | 計画改善 |
| P3 | 見た目・微コピー・将来ロール差 | バックログ |

---

## 10. 成果物

1. 本 PLAN / WORKLOG / REPORT  
2. `backend/docs/ADMIN_UX_MANUALESS_AUDIT_v1.0.md`（ケース判定＋問題一覧＋推奨順）  
3. `DOCS_INDEX.md` への索引追記  

---

## 更新履歴

| 日時 | 内容 |
|------|------|
| 2026-07-18 21:30:51 | 初版作成 |
| 2026-07-18 21:36:11 | DoD 完了チェック。ブラウザ検証反映 |
