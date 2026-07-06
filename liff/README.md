# tugical LIFF Application

tugicalのエンドユーザー向けLINE予約システム（LIFFアプリケーション）

## 🚀 クイックスタート

### Docker環境での実行（推奨）

```bash
# プロジェクトルートで実行
docker-compose up liff

# または全サービスを起動
docker-compose up
```

### ローカル環境での実行

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# またはスクリプトを使用
./scripts/dev.sh
```

## 📱 アクセス方法

- **Docker環境**: http://localhost/liff/
- **ローカル環境**: http://localhost:3001/

## 🔧 環境変数

`env.example`をコピーして`.env`ファイルを作成し、以下の値を設定してください：

```bash
# LINE LIFF ID（必須）
VITE_LIFF_ID=your-liff-id-here

# API Base URL（必須）
VITE_API_BASE_URL=http://localhost/api/v1

# Store ID（必須）
VITE_STORE_ID=1
```

## 🏗️ 開発

### 利用可能なスクリプト

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# ビルドプレビュー
npm run preview

# リント実行
npm run lint
```

### 技術スタック

- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - ビルドツール
- **Tailwind CSS** - スタイリング
- **Framer Motion** - アニメーション
- **React Router** - ルーティング
- **LINE LIFF SDK** - LINE統合

### プロジェクト構造

```
src/
├── components/     # 再利用可能なコンポーネント
├── pages/         # ページコンポーネント
├── hooks/         # カスタムフック
├── services/      # API通信
├── types/         # TypeScript型定義
├── utils/         # ユーティリティ関数
└── styles/        # スタイルファイル
```

## 🎨 デザインシステム

tugicalのデザインシステムに準拠：

- **プライマリカラー**: ミントグリーン (#10b981)
- **レスポンシブ**: モバイルファースト
- **タッチターゲット**: 44px以上
- **アニメーション**: Framer Motion統合

## 📋 予約フロー

1. **メニュー選択** - 利用可能なメニューから選択
2. **日時選択** - カレンダーから日時を選択
3. **顧客情報** - 個人情報を入力
4. **予約確認** - 予約内容を確認
5. **予約完了** - 予約確定とLINE通知

## 🔒 セキュリティ

- LINE認証によるユーザー認証
- マルチテナント対応（store_id分離）
- CORS設定による適切なアクセス制御

## 🐛 トラブルシューティング

### Docker環境でnpmが実行されない場合

```bash
# コンテナを再起動
docker-compose restart liff

# ログを確認
docker-compose logs liff

# コンテナ内で直接実行
docker-compose exec liff sh
npm install
npm run dev
```

### ポートが使用中の場合

```bash
# ポート3001が使用中の場合、別のポートを使用
docker-compose up liff -p 3002:3001
```

## 📄 ライセンス

tugicalプロジェクトの一部として提供されています。 