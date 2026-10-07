<?php

namespace Tests\Feature;

use App\Models\Faq;
use App\Models\Resource;
use App\Support\CourseTrack;
use App\Support\CourseType;
use Tests\TestCase;

/**
 * سورس جلسات، فایل‌های مورد نیاز و سوالات متداول به دو بخش «وب» و
 * «هوش مصنوعی» تقسیم شده‌اند:
 *
 *  - سوپر ادمین هر دو بخش را می‌بیند و می‌تواند به هر کدام اضافه کند؛
 *  - پشتیبان و ناظر اکانت فقط بخش هم‌نوع خودشان را می‌بینند و مالک محتوای
 *    ثبت‌شده‌شان‌اند؛
 *  - دانشجو فقط سورس‌ها و سوالات مسیر خودش (آفلاین/هوش یا آفلاین/وب) را
 *    دریافت می‌کند؛ نبودِ مسیر یعنی هر دو بخش.
 */
class ContentChannelTest extends TestCase
{
    public function test_support_sees_only_its_own_channel(): void
    {
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $aiSupport = $this->makeSupport(['support_type' => 'ai']);
        $webSource = $this->makeResource(['channel' => 'web']);
        $aiSource = $this->makeResource(['channel' => 'ai']);

        $response = $this->actingAs($webSupport, 'sanctum')
            ->getJson('/api/resources?type=session_source');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($webSource->id, $response->json('data.0.id'));

        $this->actingAs($aiSupport, 'sanctum')
            ->getJson('/api/resources?type=session_source')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $aiSource->id);
    }

    public function test_support_cannot_widen_its_scope_with_a_query_parameter(): void
    {
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $this->makeResource(['channel' => 'ai']);

        $this->actingAs($webSupport, 'sanctum')
            ->getJson('/api/resources?type=session_source&channel=ai')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($webSupport, 'sanctum')
            ->getJson('/api/resources?type=session_source&channel=all')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_support_cannot_read_edit_or_delete_the_other_channel(): void
    {
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $aiSource = $this->makeResource(['channel' => 'ai', 'title' => 'سورس هوش']);
        $aiFaq = $this->makeFaq(['channel' => 'ai']);

        $this->actingAs($webSupport, 'sanctum')
            ->getJson("/api/resources/{$aiSource->id}")
            ->assertStatus(404);

        $this->actingAs($webSupport, 'sanctum')
            ->putJson("/api/resources/{$aiSource->id}", ['title' => 'دزدی'])
            ->assertStatus(404);

        $this->actingAs($webSupport, 'sanctum')
            ->deleteJson("/api/resources/{$aiSource->id}")
            ->assertStatus(404);

        $this->actingAs($webSupport, 'sanctum')
            ->getJson("/api/faqs/{$aiFaq->id}")
            ->assertStatus(404);

        $this->actingAs($webSupport, 'sanctum')
            ->deleteJson("/api/faqs/{$aiFaq->id}")
            ->assertStatus(404);

        $this->assertDatabaseHas('resources', ['id' => $aiSource->id, 'title' => 'سورس هوش']);
        $this->assertDatabaseHas('faqs', ['id' => $aiFaq->id]);
    }

    public function test_content_created_by_a_support_lands_in_their_own_channel(): void
    {
        $aiSupport = $this->makeSupport(['support_type' => 'ai']);

        // حتی با کانالِ ارسالیِ دلخواه، بخش از خودِ کاربر می‌آید.
        $this->actingAs($aiSupport, 'sanctum')
            ->postJson('/api/resources', [
                'title' => 'متن پرامپت',
                'type' => 'session_source',
                'channel' => 'web',
                'file_url' => 'https://example.com/a.zip',
            ])
            ->assertStatus(201)
            ->assertJsonPath('resource.channel', 'ai');

        $this->actingAs($aiSupport, 'sanctum')
            ->postJson('/api/faqs', [
                'question' => 'مدل چیست؟',
                'answer' => 'یک توضیح بلند درباره مدل.',
                'channel' => 'web',
            ])
            ->assertStatus(201)
            ->assertJsonPath('faq.channel', 'ai');
    }

    public function test_support_cannot_move_their_content_to_the_other_channel(): void
    {
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $source = $this->makeResource(['channel' => 'web']);
        $faq = $this->makeFaq(['channel' => 'web']);

        $this->actingAs($webSupport, 'sanctum')
            ->putJson("/api/resources/{$source->id}", ['channel' => 'ai'])
            ->assertOk()
            ->assertJsonPath('resource.channel', 'web');

        $this->actingAs($webSupport, 'sanctum')
            ->putJson("/api/faqs/{$faq->id}", [
                'channel' => 'ai',
                'question' => 'سوال تازه',
                'answer' => 'پاسخ تازه برای همان سوال.',
            ])
            ->assertOk()
            ->assertJsonPath('faq.channel', 'web');

        $this->assertSame('web', $source->fresh()->channel);
        $this->assertSame('web', $faq->fresh()->channel);
    }

    public function test_super_admin_sees_both_channels_and_can_pick_one(): void
    {
        $admin = $this->makeAdmin();
        $this->makeResource(['channel' => 'web']);
        $this->makeResource(['channel' => 'ai']);
        $this->makeFaq(['channel' => 'web']);
        $this->makeFaq(['channel' => 'ai']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/resources?type=session_source')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/resources?type=session_source&channel=ai')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.channel', 'ai');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/faqs')
            ->assertOk()
            ->assertJsonCount(2);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/faqs?channel=web')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.channel', 'web');
    }

    public function test_super_admin_can_add_content_to_either_channel(): void
    {
        $admin = $this->makeAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/resources', [
                'title' => 'سورس وب',
                'type' => 'required_file',
                'channel' => 'web',
                'file_url' => 'https://example.com/web.pdf',
            ])
            ->assertStatus(201)
            ->assertJsonPath('resource.channel', 'web');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/resources', [
                'title' => 'سورس هوش',
                'type' => 'required_file',
                'channel' => 'ai',
                'file_url' => 'https://example.com/ai.pdf',
            ])
            ->assertStatus(201)
            ->assertJsonPath('resource.channel', 'ai');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/faqs', [
                'question' => 'سوال وب؟',
                'answer' => 'پاسخ بلند برای بخش وب.',
                'channel' => 'web',
            ])
            ->assertStatus(201)
            ->assertJsonPath('faq.channel', 'web');

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/faqs', [
                'question' => 'سوال هوش؟',
                'answer' => 'پاسخ بلند برای بخش هوش مصنوعی.',
                'channel' => 'ai',
            ])
            ->assertStatus(201)
            ->assertJsonPath('faq.channel', 'ai');
    }

    public function test_student_only_receives_their_own_track(): void
    {
        $webStudent = $this->makeStudent([], ['course' => CourseType::Offline, 'track' => CourseTrack::Web]);
        $aiStudent = $this->makeStudent([], ['course' => CourseType::Offline, 'track' => CourseTrack::ArtificialIntelligence]);
        $webSource = $this->makeResource(['type' => 'session_source', 'channel' => 'web']);
        $aiSource = $this->makeResource(['type' => 'session_source', 'channel' => 'ai']);

        $webResponse = $this->actingAs($webStudent, 'sanctum')
            ->getJson('/api/student/session-sources');
        $webResponse->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($webSource->id, $webResponse->json('data.0.id'));

        $aiResponse = $this->actingAs($aiStudent, 'sanctum')
            ->getJson('/api/student/session-sources');
        $aiResponse->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($aiSource->id, $aiResponse->json('data.0.id'));
    }

    public function test_student_without_a_track_receives_both_channels(): void
    {
        $student = $this->makeStudent([], ['course' => CourseType::InPerson]);
        $this->makeResource(['type' => 'session_source', 'channel' => 'web']);
        $this->makeResource(['type' => 'session_source', 'channel' => 'ai']);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/student/session-sources')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_student_faqs_follow_their_track(): void
    {
        $aiStudent = $this->makeStudent([], ['course' => CourseType::Offline, 'track' => CourseTrack::ArtificialIntelligence]);
        $this->makeFaq(['channel' => 'web']);
        $this->makeFaq(['channel' => 'ai']);
        $this->makeFaq(['channel' => 'ai', 'is_active' => false]);

        $response = $this->actingAs($aiStudent, 'sanctum')
            ->getJson('/api/student/faqs');

        $response->assertOk()->assertJsonCount(1);
        $this->assertSame('ai', $response->json('0.channel'));
    }

    public function test_account_observer_sees_only_their_channel(): void
    {
        $observer = $this->makeAccountObserver(['support_type' => 'ai']);
        $webFaq = $this->makeFaq(['channel' => 'web']);
        $aiFaq = $this->makeFaq(['channel' => 'ai']);

        $response = $this->actingAs($observer, 'sanctum')
            ->getJson('/api/faqs');

        $response->assertOk()->assertJsonCount(1);
        $this->assertSame($aiFaq->id, $response->json('0.id'));
        $this->assertNotSame($webFaq->id, $response->json('0.id'));
    }

    public function test_faq_categories_are_scoped_to_the_visible_channel(): void
    {
        $aiSupport = $this->makeSupport(['support_type' => 'ai']);
        $this->makeFaq(['channel' => 'web', 'category' => 'وب']);
        $this->makeFaq(['channel' => 'ai', 'category' => 'هوش']);

        $this->actingAs($aiSupport, 'sanctum')
            ->getJson('/api/faqs/categories')
            ->assertOk()
            ->assertExactJson(['هوش']);
    }

    private function makeResource(array $attributes = []): Resource
    {
        return Resource::create(array_merge([
            'title' => 'سورس وب',
            'type' => 'session_source',
            'channel' => 'web',
            'file_url' => 'https://example.com/file.zip',
            'created_by' => $this->makeAdmin()->id,
        ], $attributes));
    }

    private function makeFaq(array $attributes = []): Faq
    {
        return Faq::create(array_merge([
            'question' => 'سوال متداول وب؟',
            'answer' => 'پاسخ بلند نمونه برای آزمون.',
            'category' => 'عمومی',
            'channel' => 'web',
        ], $attributes));
    }
}
