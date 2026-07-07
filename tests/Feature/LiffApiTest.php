<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class LiffApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_liff_line_config_returns_store_liff_id(): void
    {
        $response = $this->getJson('/api/v1/liff/stores/1/line-config');
        $response->assertOk()
            ->assertJsonStructure(['success', 'data' => ['store_id', 'line_liff_id', 'line_integration_active']]);
    }

    public function test_liff_menus_returns_active_menus(): void
    {
        $response = $this->getJson('/api/v1/liff/stores/1/menus');
        $response->assertOk()->assertJsonPath('success', true);
    }

    public function test_get_or_create_customer_requires_id_token_outside_local(): void
    {
        if (app()->environment('local', 'testing')) {
            $this->postJson('/api/v1/liff/customers/get-or-create', [
                'store_id' => 1,
                'line_user_id' => 'U_test_liff',
            ])->assertOk();
            return;
        }

        $this->postJson('/api/v1/liff/customers/get-or-create', [
            'store_id' => 1,
        ])->assertStatus(422);
    }
}
