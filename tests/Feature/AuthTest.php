<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_login_with_phone_succeeds(): void
    {
        $user = $this->makeSupport();

        $response = $this->postJson('/api/login', [
            'login' => $user->phone,
            'password' => 'secret1234',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user', 'token']);
    }

    public function test_login_with_email_succeeds(): void
    {
        $user = $this->makeAdmin();

        $response = $this->postJson('/api/login', [
            'login' => $user->email,
            'password' => 'secret1234',
        ]);

        $response->assertStatus(200);
        $this->assertSame('admin', $response->json('user.role'));
    }

    public function test_login_with_wrong_password_fails(): void
    {
        $user = $this->makeSupport();

        $this->postJson('/api/login', [
            'login' => $user->phone,
            'password' => 'wrong-password',
        ])->assertStatus(401);
    }

    public function test_login_with_unknown_identifier_fails(): void
    {
        $this->postJson('/api/login', [
            'login' => 'nobody@example.com',
            'password' => 'whatever123',
        ])->assertStatus(401);
    }

    public function test_login_requires_fields(): void
    {
        $this->postJson('/api/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['login', 'password']);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = $this->makeSupport();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/me')
            ->assertStatus(200)
            ->assertJsonPath('id', $user->id);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertStatus(401);
    }

    public function test_logout_revokes_token(): void
    {
        $user = $this->makeSupport();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')->assertStatus(200);

        $this->getJson('/api/me')->assertStatus(401);
    }

    public function test_public_registration_endpoint_is_disabled(): void
    {
        // ثبت‌نام فقط از پنل ادمین انجام می‌شود
        $this->postJson('/api/register-support', [
            'name' => 'هکر',
            'phone' => '09120000000',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
        ])->assertStatus(404);
    }
}
