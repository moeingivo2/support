<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\MessageRating;
use App\Models\ShiftReport;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ActivityReportExportTest extends TestCase
{
    public function test_shift_reports_no_longer_store_call_count(): void
    {
        $this->assertFalse(Schema::hasColumn('shift_reports', 'calls_count'));
    }

    public function test_admin_can_download_excel_activity_report_for_selected_support_and_range(): void
    {
        $admin = $this->makeAdmin();
        $support = $this->makeSupport(['name' => 'پشتیبان گزارش']);
        $shift = $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now()->subDays(2)->setTime(8, 0),
            'end_time' => now()->subDays(2)->setTime(16, 30),
            'status' => 'ended',
        ]);
        ShiftReport::create([
            'shift_id' => $shift->id,
            'user_id' => $support->id,
            'responded_students_count' => 18,
            'unsatisfied_students_count' => 2,
            'desk_requests_count' => 4,
            'extra_notes' => 'یادداشت قابل بررسی',
        ]);
        $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now()->subYear()->setTime(9, 0),
            'end_time' => now()->subYear()->setTime(10, 0),
            'status' => 'ended',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson(sprintf(
            '/api/admin/activity-report/export?user_id=%d&from=%s&to=%s',
            $support->id,
            now()->subDays(3)->toDateString(),
            now()->toDateString(),
        ));

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');
        $this->assertNotFalse(simplexml_load_string($response->getContent()));
        $this->assertStringContainsString('پشتیبان گزارش', $response->getContent());
        $this->assertStringContainsString('درخواست دسک', $response->getContent());
        $this->assertStringContainsString('16:30', $response->getContent());
        $this->assertStringNotContainsString(
            now()->subYear()->toDateString(),
            $response->getContent(),
        );
        $this->assertStringNotContainsString('تماس', $response->getContent());
    }

    public function test_support_cannot_export_activity_report(): void
    {
        $support = $this->makeSupport();

        $this->actingAs($support, 'sanctum')
            ->getJson(sprintf(
                '/api/admin/activity-report/export?user_id=%d&from=%s&to=%s',
                $support->id,
                now()->subDay()->toDateString(),
                now()->toDateString(),
            ))
            ->assertStatus(403);
    }

    public function test_activity_report_rejects_an_inverted_or_oversized_date_range(): void
    {
        $admin = $this->makeAdmin();
        $support = $this->makeSupport();

        $this->actingAs($admin, 'sanctum')
            ->getJson(sprintf(
                '/api/admin/activity-report/export?user_id=%d&from=%s&to=%s',
                $support->id,
                now()->toDateString(),
                now()->subDay()->toDateString(),
            ))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['to']);

        $this->actingAs($admin, 'sanctum')
            ->getJson(sprintf(
                '/api/admin/activity-report/export?user_id=%d&from=%s&to=%s',
                $support->id,
                now()->subYears(2)->toDateString(),
                now()->toDateString(),
            ))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['to']);
    }

    public function test_activity_report_includes_shifts_without_reports(): void
    {
        $admin = $this->makeAdmin();
        $support = $this->makeSupport();
        $support->shifts()->create([
            'channel' => 'ai',
            'start_time' => today()->setTime(8, 0),
            'end_time' => today()->setTime(9, 0),
            'status' => 'ended',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson(sprintf(
            '/api/admin/activity-report/export?user_id=%d&from=%s&to=%s',
            $support->id,
            now()->toDateString(),
            now()->toDateString(),
        ));

        $response->assertStatus(200);
        $this->assertStringContainsString('ثبت‌نشده', $response->getContent());
        $this->assertStringContainsString('شیفت‌های بدون گزارش', $response->getContent());
    }

    public function test_activity_report_includes_chat_metrics_and_conversation_worksheet(): void
    {
        $admin = $this->makeAdmin();
        $support = $this->makeSupport();
        $student = $this->makeStudent([], ['course' => 'offline', 'track' => 'ai']);

        $shift = $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now()->subHours(4),
            'end_time' => now()->subHour(),
            'status' => 'ended',
        ]);

        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => $support->id,
            'title' => 'مشکل در کد',
        ]);
        $conversation->messages()->create([
            'sender_id' => $student->id,
            'type' => 'text',
            'body' => 'سلام',
            'created_at' => now()->subMinutes(50),
        ]);
        $conversation->messages()->create([
            'sender_id' => $support->id,
            'type' => 'code',
            'body' => 'print(1)',
            'created_at' => now()->subMinutes(20),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson(sprintf(
            '/api/admin/activity-report/export?user_id=%d&from=%s&to=%s',
            $support->id,
            now()->toDateString(),
            now()->toDateString(),
        ));

        $response->assertStatus(200);
        $this->assertNotFalse(simplexml_load_string($response->getContent()));

        $content = $response->getContent();

        // ستون‌ها و سنجه‌های پیشین پنل باید بدون تغییر باقی بمانند
        $this->assertStringContainsString('مجموع مدت کار', $content);
        $this->assertStringContainsString('مجموع ساعت کاری', $content);
        $this->assertStringContainsString('دانشجویان پاسخ‌داده‌شده', $content);
        $this->assertStringContainsString('دانشجویان ناراضی', $content);

        // سنجه‌های گفتگو
        $this->assertStringContainsString('تعداد گفتگو', $content);
        $this->assertStringContainsString('تعداد دانشجویان گفتگوکرده', $content);
        $this->assertStringContainsString('دانشجویان ناراضی (نارضایتی ثبت‌شده)', $content);
        $this->assertStringContainsString('مجموع پیام‌های دانشجو', $content);
        $this->assertStringContainsString('مجموع پیام‌های پشتیبان', $content);
        $this->assertStringContainsString('میانگین زمان اولین پاسخ (دقیقه)', $content);

        // ستون‌های گفتگو در شیت جزئیات و شیت گفتگو با دانشجویان
        $this->assertStringContainsString('گفتگو با دانشجویان', $content);
        $this->assertStringContainsString('پیام دانشجو', $content);
        $this->assertStringContainsString('دانشجو تست', $content);
        $this->assertStringContainsString('هوش مصنوعی', $content);
    }

    /**
     * امتیازها باید داخل اکسل همان پشتیبان و به‌صورت گفتگو به گفتگو ذخیره شوند،
     * در حالی که برگه‌های پیشین گزارش دست‌نخورده باقی می‌مانند.
     */
    public function test_activity_report_contains_per_conversation_ratings(): void
    {
        $admin = $this->makeAdmin();
        $support = $this->makeSupport(['name' => 'پشتیبان امتیازدار']);
        $otherSupport = $this->makeSupport(['name' => 'پشتیبان دیگر']);

        foreach ([5, 4, 3] as $index => $value) {
            $student = $this->makeStudent(['name' => 'دانشجو امتیاز '.$index]);

            $conversation = Conversation::create([
                'student_id' => $student->id,
                'support_id' => $support->id,
                'title' => 'گفتگوی امتیازدار '.$index,
                'status' => 'closed',
                'closure_actor' => 'student',
                'closed_by' => $student->id,
                'closed_at' => now()->subHours($index + 1),
            ]);

            MessageRating::create([
                'conversation_id' => $conversation->id,
                'student_id' => $student->id,
                'support_agent_id' => $support->id,
                'rating_value' => $value,
                'closure_actor' => 'student',
                'submitted_at' => now()->subHours($index + 1),
            ]);
        }

        $response = $this->actingAs($admin, 'sanctum')->getJson(sprintf(
            '/api/admin/activity-report/export?user_id=%d&from=%s&to=%s',
            $support->id,
            now()->subDays(2)->toDateString(),
            now()->toDateString(),
        ));

        $response->assertStatus(200);
        $content = $response->getContent();
        $this->assertNotFalse(simplexml_load_string($content));

        // برگه‌های امتیازدهی به گزارش افزوده شده‌اند
        $this->assertStringContainsString('امتیاز گفتگو به گفتگو', $content);
        $this->assertStringContainsString('توزیع امتیازها', $content);
        $this->assertStringContainsString('رضایت دانشجویان', $content);

        // هر گفتگوی امتیازدار جداگانه در اکسل آمده است
        $this->assertStringContainsString('گفتگوی امتیازدار 0', $content);
        $this->assertStringContainsString('گفتگوی امتیازدار 1', $content);
        $this->assertStringContainsString('گفتگوی امتیازدار 2', $content);
        $this->assertStringContainsString('دانشجو امتیاز 0', $content);
        $this->assertStringContainsString('★★★', $content);

        // میانگین و توزیع در بخش خلاصه
        $this->assertStringContainsString('میانگین امتیاز', $content);
        $this->assertStringContainsString('مجموع امتیازها', $content);

        // برگه‌های پیشین نباید حذف یا جابه‌جا شوند
        $this->assertStringContainsString('خلاصه', $content);
        $this->assertStringContainsString('جزئیات فعالیت', $content);
        $this->assertStringContainsString('گفتگو با دانشجویان', $content);

        // امتیاز پشتیبان دیگر نباید در این گزارش نشت کند
        $this->assertStringNotContainsString('پشتیبان دیگر', $content);
    }

    /**
     * پشتیبان بدون امتیاز نباید باعث خطا یا گزارش خراب شود
     */
    public function test_activity_report_handles_support_without_any_ratings(): void
    {
        $admin = $this->makeAdmin();
        $support = $this->makeSupport(['name' => 'پشتیبان بدون امتیاز']);

        $response = $this->actingAs($admin, 'sanctum')->getJson(sprintf(
            '/api/admin/activity-report/export?user_id=%d&from=%s&to=%s',
            $support->id,
            now()->toDateString(),
            now()->toDateString(),
        ));

        $response->assertStatus(200);
        $content = $response->getContent();

        $this->assertNotFalse(simplexml_load_string($content));
        $this->assertStringContainsString('برای این پشتیبان امتیازی ثبت نشده است', $content);
    }
}
