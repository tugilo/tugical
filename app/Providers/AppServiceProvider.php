<?php

namespace App\Providers;

use App\Models\Menu;
use App\Models\Resource;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ポリモーフィック種別を短いキーで固定（entity_images.imageable_type）
        Relation::enforceMorphMap([
            'menu' => Menu::class,
            'resource' => Resource::class,
        ]);
    }
}
