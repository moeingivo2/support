<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAccountManagementTest extends TestCase
{
    public function test_admin_can_create_update_list_and_delete_admins(): void
    {
        $admin = $this->makeAdmin();

        $createResponse = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/admins', [
            'name' => 'مدیر دوم',
            'email' => 'second-admin@example.com',
            'phone' => '09121110000',
            'password' => 'secret1234',
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.name', 'مدیر دوم');
        $createdAdmin = User::where('email', 'second-admin@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('secret1234', $createdAdmin->password));

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/admins')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/admins/{$createdAdmin->id}", [
                'name' => 'مدیر ویرایش‌شده',
                'email' => 'second-admin@example.com',
                'phone' => '09121110001',
                'password' => '',
            ])
            ->assertStatus(200)
            ->assertJsonPath('user.name', 'مدیر ویرایش‌شده');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/admins/{$createdAdmin->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('users', ['id' => $createdAdmin->id]);
    }

    public function test_admin_cannot_delete_the_current_account(): void
    {
        $admin = $this->makeAdmin();
        $otherAdmin = $this->makeAdmin();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/admins/{$admin->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        $this->assertDatabaseHas('users', ['id' => $otherAdmin->id]);
    }

    public function test_support_cannot_manage_admin_accounts(): void
    {
        $support = $this->makeSupport();
        $admin = $this->makeAdmin();

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/admin/admins')
            ->assertStatus(403);

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/admin/admins', [
                'name' => 'غیرمجاز',
                'email' => 'forbidden-admin@example.com',
                'phone' => '09122220000',
                'password' => 'secret1234',
            ])
            ->assertStatus(403);

        $this->assertDatabaseMissing('users', ['email' => 'forbidden-admin@example.com']);
    }
}
