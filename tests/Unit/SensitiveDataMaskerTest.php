<?php

namespace Tests\Unit;

use App\Support\SensitiveDataMasker;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SensitiveDataMaskerTest extends TestCase
{
    #[Test]
    public function it_masks_password_and_line_secrets(): void
    {
        $masked = SensitiveDataMasker::mask([
            'email' => 'admin@example.com',
            'password' => 'secret123',
            'line_channel_secret' => 'abc',
            'line_access_token' => 'token',
            'store_id' => 1,
        ]);

        $this->assertSame('[REDACTED]', $masked['password']);
        $this->assertSame('[REDACTED]', $masked['line_channel_secret']);
        $this->assertSame('[REDACTED]', $masked['line_access_token']);
        $this->assertSame('[REDACTED]', $masked['email']);
        $this->assertSame(1, $masked['store_id']);
    }

    #[Test]
    public function it_masks_customer_pii_fields(): void
    {
        $masked = SensitiveDataMasker::mask([
            'name' => '山田太郎',
            'phone' => '090-1234-5678',
            'email' => 'user@example.com',
            'notes' => 'メモ',
        ]);

        $this->assertSame('[REDACTED]', $masked['name']);
        $this->assertSame('[REDACTED]', $masked['phone']);
        $this->assertSame('[REDACTED]', $masked['email']);
        $this->assertSame('[REDACTED]', $masked['notes']);
    }
}
