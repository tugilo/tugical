# tugical 仕様書

このフォルダには、tugical（ツギカル）プロジェクトの全仕様書が格納されています。

## 📚 仕様書一覧

### 1. システム仕様書
- **ファイル**: `tugical_system_specification_v2.0.md`
- **バージョン**: v2.2
- **内容**: 全体アーキテクチャ、複数メニュー組み合わせ、電話予約最適化、業種別UI最適化、汎用時間スロット設定システム

### 2. データベース設計書
- **ファイル**: `tugical_database_design_v1.0.md`
- **バージョン**: v1.2
- **内容**: テーブル定義、booking_details設計、マルチテナント構造、時間スロット設定、業種別属性、外部キー制約

### 3. API仕様書
- **ファイル**: `tugical_api_specification_v1.0.md`
- **バージョン**: v1.2
- **内容**: RESTful API仕様、複数メニュー予約API、電話予約最適化API、エラーハンドリング、認証、レスポンス形式

### 4. 要件定義書
- **ファイル**: `tugical_requirements_specification_v1.0.md`
- **バージョン**: v1.1
- **内容**: ビジネス要件、機能要件、非機能要件

### 5. UI/UX設計書
- **ファイル**: `tugical_ui_design_system_v1.0.md`
- **バージョン**: v1.0
- **内容**: デザインシステム、コンポーネント仕様、レスポンシブ対応

### 6. テスト戦略書
- **ファイル**: `tugical_test_strategy_v1.0.md`
- **バージョン**: v1.0
- **内容**: テスト方針、カバレッジ要件、E2Eテスト

### 7. デプロイメント書
- **ファイル**: `tugical_deployment_guide_v1.0.md`
- **バージョン**: v1.0
- **内容**: VPS運用、環境構築、CI/CD

### 8. その他の仕様書
- **プロジェクト概要**: `tugical_project_overview.md`
- **電話予約ユースケース**: `tugical_phone_booking_usecase_v1.0.md`
- **新信金マープ**: `tugical_shinkin_marp.md`

## 🔒 重要事項

### 実装前確認
- **必須**: 実装前には該当する仕様書を必ず確認してください
- **優先順位**: .cursorrulesと矛盾時は仕様書を優先
- **バージョン**: 最新バージョンの仕様書を使用

### 更新履歴
- 仕様書の更新時は、バージョン番号を適切に更新
- 更新内容は各仕様書の冒頭に記載
- 重要な変更は.cursorrulesの仕様書索引も更新

## 📁 フォルダ構成

```
docs/
├── 仕様書/                    # このフォルダ
│   ├── README.md             # このファイル
│   ├── tugical_system_specification_v2.0.md
│   ├── tugical_database_design_v1.0.md
│   ├── tugical_api_specification_v1.0.md
│   ├── tugical_requirements_specification_v1.0.md
│   ├── tugical_ui_design_system_v1.0.md
│   ├── tugical_test_strategy_v1.0.md
│   ├── tugical_deployment_guide_v1.0.md
│   ├── tugical_project_overview.md
│   ├── tugical_phone_booking_usecase_v1.0.md
│   └── tugical_shinkin_marp.md
├── PROGRESS.md               # 開発進捗
├── CURRENT_FOCUS.md          # 現在の焦点
└── その他のドキュメント
```

---

**tugical (ツギカル)** - 次の時間が、もっと自由になる。 