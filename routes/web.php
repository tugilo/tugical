<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

// トップは管理画面へリダイレクト（Laravel初期画面を表示しない）
Route::get('/', function () {
    return redirect('/admin');
});

// 管理者画面（SPA）
Route::get('/admin/{any?}', function () {
    return view('admin');
})->where('any', '.*')->name('admin');

// LIFF画面（SPA）
Route::get('/liff/{any?}', function () {
    return view('liff');
})->where('any', '.*')->name('liff');

// ログインページ（APIアプリケーションなので401エラー時のリダイレクト用）
Route::get('/login', function () {
    return response()->json([
        'success' => false,
        'error' => [
            'code' => 'UNAUTHENTICATED',
            'message' => '認証が必要です。/api/v1/auth/login エンドポイントを使用してください。',
        ],
        'meta' => [
            'api_login_endpoint' => '/api/v1/auth/login',
            'timestamp' => now()->toISOString(),
        ]
    ], 401);
})->name('login');
