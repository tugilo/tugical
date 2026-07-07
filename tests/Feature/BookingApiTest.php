<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_authenticated_user_can_list_bookings(): void
    {
        $user = User::where('store_id', 1)->first();
        $this->assertNotNull($user);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/bookings')
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
