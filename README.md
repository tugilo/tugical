# tugical（ツギカル）

**次の時間が、もっと自由になる。**

統合 Laravel アプリケーション版 v2.3

## 🎯 プロジェクト概要

**tugical**は時間ベースのリソース予約が必要な全ての業種に対応する汎用プラットフォームです。

### 🎉 統合完了

**統合前:**

```
├─ frontend/ (別サーバー)
├─ liff/ (別サーバー)
├─ backend/ (Laravel)
└─ docs/ (ルート)
```

**統合後:**

```
└─ backend/ (統合Laravelアプリケーション)
    ├─ resources/js/ (統合フロントエンド)
    │   ├─ components/admin/ (管理者機能)
    │   ├─ components/liff/ (LIFF機能)
    │   ├─ pages/admin/ (管理者画面)
    │   ├─ pages/liff/ (LIFF画面)
    │   ├─ stores/ (状態管理)
    │   ├─ services/ (API)
    │   └─ utils/ (ユーティリティ)
    ├─ docs/ (統合ドキュメント)
    └─ package.json (統合依存関係)
```

## 🚀 技術スタック

### 統合アーキテクチャ

- **Backend**: Laravel 10 + PHP 8.2
- **Frontend**: React 18 + TypeScript + Vite
- **Database**: MariaDB 10.11
- **Cache**: Redis
- **Container**: Docker + Docker Compose
- **Build**: 統合 Vite ビルド

### 統合のメリット

- **開発効率向上**: 単一リポジトリ・統合ビルド・統合テスト
- **運用効率向上**: 単一コンテナ・統合ログ・リソース最適化
- **保守性向上**: コード共有・型安全性・統合デプロイ

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

You may also try the [Laravel Bootcamp](https://bootcamp.laravel.com), where you will be guided through building a modern Laravel application from scratch.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com/)**
- **[Tighten Co.](https://tighten.co)**
- **[WebReinvent](https://webreinvent.com/)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel/)**
- **[Cyber-Duck](https://cyber-duck.co.uk)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Jump24](https://jump24.co.uk)**
- **[Redberry](https://redberry.international/laravel/)**
- **[Active Logic](https://activelogic.com)**
- **[byte5](https://byte5.de)**
- **[OP.GG](https://op.gg)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
