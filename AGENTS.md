# AGENTS.md

## Cursor Cloud specific instructions

This is a **Laravel 10 (PHP 8.3) + React 18 / Vite** monorepo ("tugical", a time-based
reservation/booking platform). The Laravel app serves a REST API plus two React SPAs
(admin at `/admin`, LIFF at `/liff`). See `README.md` and `docs/MAC_SETUP_GUIDE.md` for
background (note: the docs describe a Docker/Makefile workflow, but no `Dockerfile` /
`docker-compose.yml` / `Makefile` exist in this repo — run natively as described below).

### Services & how to start them

The update script only refreshes dependencies (`composer install`, `npm install`). It does
**not** start services. On a fresh session start the datastores manually (they do not
auto-start on boot):

```bash
sudo service mariadb start
sudo service redis-server start
```

- **MySQL/MariaDB** — primary datastore. Dev DB `tugical_dev`, user `tugical_dev` /
  password `dev_password_123` (matches `.env`). Data persists in the VM snapshot; if the DB
  is ever empty, recreate it and re-run migrations:
  `php artisan migrate --seed` then `php artisan db:seed --class=CustomerSeeder`
  (see the seeding note below).
- **Redis** — used for cache/session/queue (`.env` points at `127.0.0.1`, no password).

Run the backend + frontend dev servers (standard commands, see `package.json`):

```bash
php artisan serve --host=0.0.0.0 --port=8000   # API + SPA host at http://localhost:8000
npm run dev                                    # Vite dev server on :5173 (HMR)
```

### IMPORTANT: React SPA + Vite dev-server caveat

The Blade shells (`resources/views/admin.blade.php`, `liff.blade.php`) are **missing the
`@viteReactRefresh` directive**. As a result, when the Vite dev server (`npm run dev`) is
running, the React SPA fails to mount with `Uncaught Error: @vitejs/plugin-react can't
detect preamble` and the page is blank. This is a pre-existing app-code issue, not an
environment problem.

To view/verify the SPA in a browser, use the **compiled build** served by Laravel instead:

```bash
npm run build          # produces public/build/manifest.json
rm -f public/hot       # ensure Blade uses the manifest, not the dev server
php artisan serve --host=0.0.0.0 --port=8000
```

(Running `npm run dev` recreates `public/hot`; remove it again after stopping the dev server.)

### App state note

The admin SPA entry `resources/js/pages/admin/App.tsx` is currently a **static placeholder**
(no router wired up), so the browser UI only shows an "統合完了" info page. The full,
functional product surface is the **REST API** under `/api/v1/*` (auth, bookings,
availability, customers, menus, resources). End-to-end testing is done against the API.

### Seeding note

`DatabaseSeeder` only registers `TestUserSeeder` and `MenuSeeder`. `CustomerSeeder` and
resource data are NOT seeded by `--seed`; run `php artisan db:seed --class=CustomerSeeder`
separately if you need customers (required to create bookings).

Test login (from `TestUserSeeder`): `owner@tugical.test` / `password123`, `store_id: 1`
(also manager/staff/reception @tugical.test).

### Lint / test / build

- Lint (PHP): `./vendor/bin/pint --test` (Pint reports pre-existing style deviations in
  `database/` and `routes/`; not caused by setup). No JS ESLint config exists despite ESLint
  being installed, so there is no `npm run lint`.
- Tests: `php artisan test`. The default `Tests\Feature\ExampleTest` fails (expects `/` to
  return 200, but `routes/web.php` redirects `/` → `/admin` = 302). This is a stale skeleton
  test, unrelated to setup.
- Build: `npm run build`.

### Health check

`curl -s http://127.0.0.1:8000/api/health` returns DB + Redis status — use it to confirm
both datastores are reachable.
