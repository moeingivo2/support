<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\IranianPhone;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * ورود دانشجو با شماره موبایل و یکسان‌سازی پیام‌های خطا.
 */
class StudentPhoneLoginTest extends TestCase
{
    private const INVALID_CREDENTIALS = 'شماره موبایل یا رمز عبور اشتباه است.';

    private function studentWithPhone(string $phone = '09121234567'): User
    {
        return User::create([
            'name' => 'دانشجو موبایلی',
            'phone' => IranianPhone::normalize($phone),
            'password' => Hash::make('secret1234'),
            'role' => 'student',
        ]);
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function acceptedPhoneFormats(): array
    {
        return [
            'leading zero' => ['09121234567'],
            'country code' => ['989121234567'],
            'plus prefix' => ['+989121234567'],
            'zero zero country code' => ['00989121234567'],
            'persian digits' => ['۰۹۱۲۱۲۳۴۵۶۷'],
        ];
    }

    #[DataProvider('acceptedPhoneFormats')]
    public function test_login_accepts_every_supported_phone_format(string $input): void
    {
        $this->studentWithPhone();

        $this->postJson('/api/login/student', [
            'phone' => $input,
            'password' => 'secret1234',
        ])->assertStatus(200)
            ->assertJsonPath('user.role', 'student')
            ->assertJsonStructure(['user', 'token']);
    }

    public function test_login_response_has_identical_message_for_every_failure_mode(): void
    {
        $this->studentWithPhone('09121234567');

        $responses = [
            // رمز غلط
            $this->postJson('/api/login/student', [
                'phone' => '09121234567',
                'password' => 'wrong-password',
            ]),
            // شماره ناموجود
            $this->postJson('/api/login/student', [
                'phone' => '09998887777',
                'password' => 'secret1234',
            ]),
            // شماره نامعتبر
            $this->postJson('/api/login/student', [
                'phone' => '12345',
                'password' => 'secret1234',
            ]),
        ];

        foreach ($responses as $response) {
            $response->assertStatus(401)
                ->assertJson(['message' => self::INVALID_CREDENTIALS]);
        }
    }

    public function test_support_account_cannot_log_in_through_student_login(): void
    {
        User::create([
            'name' => 'پشتیبان',
            'phone' => '09121234567',
            'password' => Hash::make('secret1234'),
            'role' => 'support',
            'support_type' => 'web',
        ]);

        $this->postJson('/api/login/student', [
            'phone' => '09121234567',
            'password' => 'secret1234',
        ])->assertStatus(401)
            ->assertJson(['message' => self::INVALID_CREDENTIALS]);
    }

    public function test_repeated_failures_are_rate_limited(): void
    {
        $this->studentWithPhone('09121234567');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login/student', [
                'phone' => '09121234567',
                'password' => 'wrong-password',
            ])->assertStatus(401);
        }

        $this->postJson('/api/login/student', [
            'phone' => '09121234567',
            'password' => 'secret1234',
        ])->assertStatus(429);
    }

    public function test_login_requires_phone_and_password(): void
    {
        $this->postJson('/api/login/student', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone', 'password']);
    }

    // ---------------------------------------------------------------- بازیابی رمز

    public function test_password_reset_accepts_iranian_phone_and_does_not_reveal_registration(): void
    {
        $this->studentWithPhone('09121234567');

        $known = $this->postJson('/api/password/forgot', ['phone' => '09121234567'])
            ->assertStatus(201);

        $unknown = $this->postJson('/api/password/forgot', ['phone' => '09998887777'])
            ->assertStatus(201);

        // ثبت‌نام‌شده و ثبت‌نشده پیام یکسان می‌گیرند تا وجود حساب افشا نشود
        $this->assertSame(
            $known->json('message'),
            $unknown->json('message'),
        );

        // هر دو شماره نرمال ذخیره می‌شوند تا پاسخ و رفتار برای هر دو یکسان بماند
        $this->assertDatabaseHas('password_reset_requests', ['phone' => '989121234567']);
        $this->assertDatabaseHas('password_reset_requests', ['phone' => '989998887777']);
    }

    public function test_password_reset_rejects_invalid_phone_format(): void
    {
        $this->postJson('/api/password/forgot', ['phone' => '12345'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_password_reset_is_rate_limited_per_phone(): void
    {
        $this->studentWithPhone('09121234567');

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->postJson('/api/password/forgot', ['phone' => '09121234567'])
                ->assertStatus(201);
        }

        $this->postJson('/api/password/forgot', ['phone' => '09121234567'])
            ->assertStatus(429);
    }
}
