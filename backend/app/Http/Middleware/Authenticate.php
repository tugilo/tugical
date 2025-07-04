<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // API リクエストの場合は null を返して 401 レスポンスを送信
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }
        
        // Web リクエストの場合もログインページが存在しないため null を返す
        return null;
    }
}
