<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class StoreLineSettingsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_can_update_line_settings_with_masked_response(): void
    {
        $user = User::where('store_id', 1)->first();
        $this->assertNotNull($user);

        $store = Store::findOrFail(1);
        $original = [
            'line_channel_id' => $store->line_channel_id,
            'line_channel_secret' => $store->line_channel_secret,
            'line_access_token' => $store->line_access_token,
            'line_liff_id' => $store->line_liff_id,
            'line_integration_active' => $store->line_integration_active,
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->putJson('/api/v1/store/line-settings', [
                'line_channel_id' => '2000000001',
                'line_channel_secret' => 'secret-value',
                'line_access_token' => 'token-value',
                'line_liff_id' => 'liff-test-id',
                'line_integration_active' => true,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.line_channel_id', '2000000001')
            ->assertJsonPath('data.line_channel_secret_set', true)
            ->assertJsonPath('data.line_access_token_set', true)
            ->assertJsonPath('data.line_liff_id', 'liff-test-id');

        $store->refresh();
        $this->assertSame('secret-value', $store->line_channel_secret);
        $this->assertSame('token-value', $store->line_access_token);
        $this->assertTrue($store->hasLineIntegration());

        $store->update($original);
    }

    public function test_test_push_requires_line_user_id(): void
    {
        $user = User::where('store_id', 1)->first();
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/store/line-settings/test-push', [])
            ->assertStatus(422);
    }
}
