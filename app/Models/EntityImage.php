<?php

namespace App\Models;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * エンティティ画像モデル（メニュー・リソースの1対多画像）
 *
 * @property int $id
 * @property int $store_id
 * @property string $imageable_type
 * @property int $imageable_id
 * @property string $url
 * @property int $sort_order
 * @property bool $is_primary
 */
class EntityImage extends Model
{
    use HasFactory;

    protected $table = 'entity_images';

    protected $guarded = ['id'];

    protected $casts = [
        'sort_order' => 'integer',
        'is_primary' => 'boolean',
    ];

    /**
     * TenantScope を適用
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (EntityImage $image) {
            if (!$image->store_id && auth()->check()) {
                $image->store_id = auth()->user()->store_id;
            }
        });
    }

    /**
     * 所属店舗
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * 親エンティティ（Menu / Resource）
     */
    public function imageable(): MorphTo
    {
        return $this->morphTo();
    }
}
