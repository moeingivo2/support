<?php

namespace Tests\Feature;

use App\Models\User;
use Tests\TestCase;

class AdminSupportTest extends TestCase
{
    public function test_admin_can_create_support_with_web_type(): void
    {
        $admin = $this->makeAdmin();

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/supports', [
                'name' => 'سارا محمدی',
                'phone' => '09121112233',
                'password' => 'secret1234',
                'support_type' => 'web',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.support_type', 'web')
            ->assertJsonPath('user.role', 'support');

        $this->assertDatabaseHas('users', [
            'phone' => '09121112233',
            'role' => 'support',
            'support_type' => 'web',
        ]);
    }

    public function test_admin_can_create_support_with_ai_type(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/supports', [
                'name' => 'پشتیبان AI',
                'phone' => '09124445566',
                'password' => 'secret1234',
                'support_type' => 'ai',
            ])->assertStatus(201)
            ->assertJsonPath('user.support_type', 'ai');
    }

    public function test_support_type_must_be_web_or_ai(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/supports', [
                'name' => 'تست',
                'phone' => '09125556667',
                'password' => 'secret1234',
                'support_type' => 'phone',
            ])->assertStatus(422)
            ->assertJsonValidationErrors(['support_type']);
    }

    public function test_duplicate_phone_is_rejected(): void
    {
        $admin = $this->makeAdmin();
        $existing = $this->makeSupport();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/supports', [
                'name' => 'تکراری',
                'phone' => $existing->phone,
                'password' => 'secret1234',
                'support_type' => 'web',
            ])->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_admin_can_list_supports(): void
    {
        $admin = $this->makeAdmin();
        $this->makeSupport(['support_type' => 'ai']);
        $this->makeSupport(['support_type' => 'web']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/supports');

        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_supports_list_excludes_admins(): void
    {
        $admin = $this->makeAdmin();
        $this->makeSupport();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/supports');

        $response->assertStatus(200);
        foreach ($response->json('data') as $item) {
            $this->assertNotSame('admin', $item['role'] ?? 'support');
        }
    }

    public function test_created_support_password_is_hashed(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/supports', [
                'name' => 'هش تست',
                'phone' => '09127778899',
                'password' => 'plain-password-123',
                'support_type' => 'web',
            ])->assertStatus(201);

        $user = User::where('phone', '09127778899')->first();
        $this->assertNotSame('plain-password-123', $user->password);
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('plain-password-123', $user->password));
    }
}
