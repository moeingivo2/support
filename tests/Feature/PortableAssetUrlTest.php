<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Support\ActorRole;
use App\Support\CourseTrack;
use App\Support\CourseType;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * لینک دانلود نباید به پورت یا دامنه‌ی اجرا گره بخورد.
 *
 * `url(Storage::url(...))` و `route(...)` بدون `absolute: false` مقدار مطلق با
 * host از APP_URL می‌ساختند؛ وقتی برنامه روی پورتی جز ۵۱۷۳ اجرا می‌شد، مرورگر
 * لینک را روی میزبان اشتباه می‌خواند و «خطا در دریافت اطلاعات» می‌گرفت.
 */
class PortableAssetUrlTest extends TestCase
{
    public function test_resource_upload_returns_a_relative_download_path(): void
    {
        Storage::fake('public');

        $support = $this->makeSupport(['support_type' => 'web']);

        $response = $this->actingAs($support, 'sanctum')
            ->postJson('/api/resources', [
                'title' => 'سورس وب',
                'type' => 'session_source',
                'file' => UploadedFile::fake()->create('source.pdf', 10, 'application/pdf'),
            ]);

        $response->assertStatus(201);

        $url = $response->json('resource.file_url');

        // همیشه نسبی: با هر پورتی اجرا شود، مرورگر همان host خودش را می‌زند.
        $this->assertIsString($url);
        $this->assertStringStartsWith('/api/attachments/', (string) $url);
        $this->assertStringEndsWith('.pdf', (string) $url);
        $this->assertStringNotContainsString('http', (string) $url);
    }

    public function test_profile_payload_exposes_a_relative_roadmap_path(): void
    {
        Storage::fake('public');

        $student = $this->makeStudent([], [
            'course' => CourseType::Offline,
            'track' => CourseTrack::Web,
        ]);
        $student->profile->update(['roadmap_path' => 'roadmaps/roadmap.pdf']);

        $response = $this->actingAs($student, 'sanctum')
            ->getJson('/api/student/profile');

        $response->assertOk()
            ->assertJsonPath('data.roadmap_url', '/api/attachments/roadmaps/roadmap.pdf');
    }

    public function test_message_attachment_stays_relative(): void
    {
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'گفتگوی تست',
        ]);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $student->id,
            'actor_id' => $student->id,
            'actor_role' => ActorRole::Student->value,
            'type' => 'image',
            'attachment_path' => 'resources/x.png',
        ]);

        $this->assertSame('/api/attachments/resources/x.png', $message->attachmentUrl());
    }
}
