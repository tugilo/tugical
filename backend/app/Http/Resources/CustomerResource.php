<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * CustomerResource
 * 顧客データをフロントエンド向けに整形
 */
class CustomerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'loyalty_rank' => $this->loyalty_rank,
            'total_bookings' => $this->total_bookings,
            'total_spent' => $this->total_amount ?? $this->total_spent ?? 0,
            'last_booking_at' => optional($this->last_booking_date)->toDateTimeString(),
            'is_active' => (bool) $this->is_active,
            'created_at' => optional($this->created_at)->toDateTimeString(),
            'updated_at' => optional($this->updated_at)->toDateTimeString(),
        ];
    }
} 