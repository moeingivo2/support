<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    public function test_admin_cannot_start_shift(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/shifts/start')
            ->assertStatus(403);
    }

    public function test_admin_cannot_end_shift(): void
    {
        $admin = $this->makeAdmin();
        $support = $this->makeSupport();
        $shift = $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now(),
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/shifts/{$shift->id}/end")
            ->assertStatus(403);
    }

    public function test_admin_cannot_access_own_current_shift(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/shifts/current')
            ->assertStatus(403);
    }

    public function test_support_can_start_shift_with_own_support_type(): void
    {
        $support = $this->makeSupport(['support_type' => 'ai']);

        $response = $this->actingAs($support, 'sanctum')
            ->postJson('/api/shifts/start');

        $response->assertStatus(201)
            ->assertJsonPath('shift.channel', 'ai')
            ->assertJsonPath('shift.status', 'active');
    }

    public function test_support_with_existing_active_shift_cannot_start_another(): void
    {
        $support = $this->makeSupport();
        $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now(),
            'status' => 'active',
        ]);

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/shifts/start')
            ->assertStatus(422);
    }

    public function test_support_cannot_end_another_users_shift(): void
    {
        $owner = $this->makeSupport();
        $attacker = $this->makeSupport();
        $shift = $owner->shifts()->create([
            'channel' => 'web',
            'start_time' => now(),
            'status' => 'active',
        ]);

        $this->actingAs($attacker, 'sanctum')
            ->postJson("/api/shifts/{$shift->id}/end")
            ->assertStatus(403);
    }

    public function test_active_shifts_endpoint_is_admin_only(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/shifts/active')
            ->assertStatus(403);
    }

    public function test_admin_can_view_active_shifts(): void
    {
        $admin = $this->makeAdmin();
        $support = $this->makeSupport();
        $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now(),
            'status' => 'active',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/shifts/active');

        $response->assertStatus(200)->assertJsonCount(1, 'shifts');
    }

    public function test_support_registration_endpoint_is_admin_only(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/admin/supports', [
                'name' => 'پشتیبان جدید',
                'phone' => '09129999999',
                'password' => 'secret1234',
                'support_type' => 'web',
            ])->assertStatus(403);
    }
}
