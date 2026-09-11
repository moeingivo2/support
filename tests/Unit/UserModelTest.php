<?php

namespace Tests\Unit;

use App\Models\User;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    public function test_is_admin(): void
    {
        $admin = new User(['role' => 'admin']);
        $support = new User(['role' => 'support']);

        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($admin->isSupport());
        $this->assertFalse($support->isAdmin());
        $this->assertTrue($support->isSupport());
    }

    public function test_password_is_hidden_in_serialization(): void
    {
        $user = User::factory()->make();

        $this->assertArrayNotHasKey('password', $user->toArray());
        $this->assertArrayNotHasKey('remember_token', $user->toArray());
    }

    public function test_active_shift_relation_filters_by_status(): void
    {
        $user = User::factory()->create();
        $user->shifts()->create([
            'channel' => 'web',
            'start_time' => now()->subDays(2),
            'end_time' => now()->subDay(),
            'status' => 'ended',
        ]);

        $this->assertNull($user->activeShift()->first());
    }

    public function test_support_type_is_fillable(): void
    {
        $user = User::factory()->create(['support_type' => 'ai']);

        $this->assertSame('ai', $user->support_type);
    }
}
