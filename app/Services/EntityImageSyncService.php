<?php

namespace App\Services;

use App\Models\EntityImage;
use App\Models\Menu;
use App\Models\Resource;
use Illuminate\Database\Eloquent\Model;

/**
 * エンティティ画像の1対多同期サービス
 *
 * images 配列を完全置換し、メイン画像を親カラムへ同期する
 */
class EntityImageSyncService
{
    public const MAX_IMAGES = 10;

    /**
     * 画像一覧を同期する
     *
     * @param  Model  $entity  Menu または Resource
     * @param  array<int, array{url: string, is_primary?: bool}>|null  $images  null の場合は何もしない
     * @param  int  $storeId  店舗ID
     */
    public function sync(Model $entity, ?array $images, int $storeId): void
    {
        if ($images === null) {
            return;
        }

        $entity->images()->delete();

        $normalized = collect($images)
            ->filter(fn ($image) => is_array($image) && !empty($image['url']))
            ->take(self::MAX_IMAGES)
            ->values();

        $hasPrimary = $normalized->contains(
            fn ($image) => !empty($image['is_primary'])
        );

        foreach ($normalized as $index => $image) {
            $entity->images()->create([
                'store_id' => $storeId,
                'url' => $image['url'],
                'sort_order' => $index,
                'is_primary' => $hasPrimary
                    ? (bool) ($image['is_primary'] ?? false)
                    : $index === 0,
            ]);
        }

        /** @var EntityImage|null $primary */
        $primary = $entity->images()
            ->where('is_primary', true)
            ->orderBy('sort_order')
            ->first();

        if (!$primary) {
            $primary = $entity->images()->orderBy('sort_order')->first();
            if ($primary) {
                $primary->update(['is_primary' => true]);
            }
        } else {
            // メインは1枚に正規化
            $entity->images()
                ->where('id', '!=', $primary->id)
                ->where('is_primary', true)
                ->update(['is_primary' => false]);
        }

        $this->syncPrimaryColumn($entity, $primary?->url);
    }

    /**
     * 互換用の単一画像カラムへメイン画像を反映
     */
    private function syncPrimaryColumn(Model $entity, ?string $url): void
    {
        if ($entity instanceof Menu) {
            $entity->forceFill(['image_url' => $url])->saveQuietly();
            return;
        }

        if ($entity instanceof Resource) {
            $entity->forceFill(['photo_url' => $url])->saveQuietly();
        }
    }

    /**
     * image_url / photo_url 単体指定を images 形式へ変換
     *
     * @return array<int, array{url: string, is_primary: bool}>|null null=同期しない
     */
    public function normalizeFromLegacy(
        ?array $images,
        ?string $legacyUrl,
        bool $legacyPresent = false
    ): ?array {
        if ($images !== null) {
            return $images;
        }

        if (!$legacyPresent) {
            return null;
        }

        if ($legacyUrl === null || $legacyUrl === '') {
            return [];
        }

        return [
            [
                'url' => $legacyUrl,
                'is_primary' => true,
            ],
        ];
    }
}
