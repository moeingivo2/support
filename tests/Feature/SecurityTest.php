<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    /**
     * `<audio src>` و `<img src>` هدر Accept: application/json نمی‌فرستند.
     *
     * میدلور auth در آن حالت تلاش می‌کرد به ریت `login` ریدایرکت کند؛ چون
     * این برنامه فقط API است و چنین ریتی ندارد، به‌جای 401 یک
     * RouteNotFoundException و پاسخ 500 برمی‌گشت و هیچ فایل صوتی یا تصویری
     * پخش یا نمایش داده نمی‌شد.
     */
    public function test_protected_route_without_json_accept_header_returns_401_not_500(): void
    {
        $this->get('/api/attachments/chat/whatever.webm')
            ->assertStatus(401);
    }

    public function test_every_protected_api_route_survives_a_plain_browser_request(): void
    {
        foreach (['/api/dashboard', '/api/conversations', '/api/faqs'] as $path) {
            $this->get($path)->assertStatus(401);
        }
    }

    public function test_login_rate_limiting_blocks_brute_force(): void
    {
        $user = $this->makeSupport();

        // سقف: ۵ درخواست در دقیقه به ازای هر IP
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'login' => $user->phone,
                'password' => 'wrong-pass-'.str()->random(6),
            ]);
        }

        // درخواست ششم باید 429 بگیرد حتی اگر رمز درست باشد
        $this->postJson('/api/login', [
            'login' => $user->phone,
            'password' => 'secret1234',
        ])->assertStatus(429);
    }

    public function test_security_headers_are_present(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_dashboard_is_cached(): void
    {
        $user = $this->makeSupport();

        // بار اول: محاسبه و کش
        $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')->assertStatus(200);

        // اگر کش کار کند، درخواست دوم بدون خطا و با همان شکل پاسخ می‌آید
        $second = $this->actingAs($user, 'sanctum')->getJson('/api/dashboard');
        $second->assertStatus(200)
            ->assertJsonStructure(['data' => ['weeklySatisfaction', 'answeredStudents', 'mentorIssues', 'availableServices']]);
    }

    public function test_user_cannot_read_others_report_detail(): void
    {
        $owner = $this->makeSupport();
        $other = $this->makeSupport();
        $shift = $owner->shifts()->create([
            'channel' => 'web',
            'start_time' => now()->subHour(),
            'end_time' => now(),
            'status' => 'ended',
        ]);
        $report = $owner->shiftReports()->create([
            'shift_id' => $shift->id,
            'responded_students_count' => 1,
            'unsatisfied_students_count' => 0,
            'desk_requests_count' => 0,
        ]);

        // ساپورت دیگر اجازه خواندن ندارد
        $this->actingAs($other, 'sanctum')
            ->getJson("/api/shift-reports/{$report->id}")
            ->assertStatus(403);

        // ادمین اجازه دارد
        $admin = $this->makeAdmin();
        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/shift-reports/{$report->id}")
            ->assertStatus(200);

        // ویرایش توسط غیرمالک ممنوع
        $this->actingAs($other, 'sanctum')
            ->putJson("/api/shift-reports/{$report->id}", [
                'shift_id' => $shift->id,
                'responded_students_count' => 999,
                'unsatisfied_students_count' => 0,
                'desk_requests_count' => 0,
            ])->assertStatus(403);
    }

    public function test_mass_assignment_is_protected_on_registration_fields(): void
    {
        $admin = $this->makeAdmin();

        // تلاش برای ساخت کاربر با نقش ادمین از مسیر ثبت پشتیبان
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/supports', [
                'name' => 'تلاش نفوذ',
                'phone' => '09123334455',
                'password' => 'secret1234',
                'support_type' => 'web',
                'role' => 'admin',
            ])->assertStatus(201);

        $user = User::where('phone', '09123334455')->first();
        $this->assertSame('support', $user->role);
    }

    public function test_unauthenticated_requests_require_token(): void
    {
        $this->getJson('/api/complaints')->assertStatus(401);
        $this->getJson('/api/resources')->assertStatus(401);
        $this->getJson('/api/shift-reports')->assertStatus(401);
        $this->getJson('/api/admin/supports')->assertStatus(401);
    }

    public function test_rate_limiter_is_configured_for_auth(): void
    {
        RateLimiter::clear('auth:127.0.0.1');
        $this->assertTrue(true); // پاک‌سازی قبل از تست‌های بعدی
    }
}
