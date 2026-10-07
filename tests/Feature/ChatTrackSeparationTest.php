<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\User;
use App\Support\ActorRole;
use App\Support\CourseTrack;
use App\Support\CourseType;
use Tests\TestCase;

/**
 * هر حوزه‌ی چت خودش را دارد: گفتگوی دانشجوی مسیر «وب» را فقط پشتیبان‌های وب
 * می‌بینند و گفتگوی مسیر «هوش مصنوعی» را فقط پشتیبان‌های هوش مصنوعی.
 *
 * بستن گفتگو هم برای همه‌ی پشتیبان‌ها — از جمله ناظر اکانت — باز است و فقط
 * ناظرِ فقط‌خواندنی از آن محروم می‌ماند.
 */
class ChatTrackSeparationTest extends TestCase
{
    public function test_support_only_sees_students_of_their_own_track(): void
    {
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $aiSupport = $this->makeSupport(['support_type' => 'ai']);
        $webStudent = $this->studentOnTrack(CourseTrack::Web);
        $aiStudent = $this->studentOnTrack(CourseTrack::ArtificialIntelligence);
        $this->openConversation($webStudent);
        $this->openConversation($aiStudent);

        $webResponse = $this->actingAs($webSupport, 'sanctum')
            ->getJson('/api/support/conversations/students');
        $webResponse->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($webStudent->id, $webResponse->json('data.0.student.id'));

        $aiResponse = $this->actingAs($aiSupport, 'sanctum')
            ->getJson('/api/support/conversations/students');
        $aiResponse->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($aiStudent->id, $aiResponse->json('data.0.student.id'));
    }

    public function test_support_cannot_read_or_reply_to_the_other_track(): void
    {
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $conversation = $this->openConversation(
            $this->studentOnTrack(CourseTrack::ArtificialIntelligence),
        );

        $this->actingAs($webSupport, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(404);

        $this->actingAs($webSupport, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'سلام'])
            ->assertStatus(404);

        $this->actingAs($webSupport, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/close", ['closure_confirmed' => true])
            ->assertStatus(404);

        $this->assertSame(1, $conversation->fresh()->messages()->count());
    }

    public function test_unread_counter_does_not_leak_the_other_track(): void
    {
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $mine = $this->openConversation($this->studentOnTrack(CourseTrack::Web));
        $theirs = $this->openConversation(
            $this->studentOnTrack(CourseTrack::ArtificialIntelligence),
        );
        $mine->update(['unread_support_count' => 2]);
        $theirs->update(['unread_support_count' => 7]);

        $this->actingAs($webSupport, 'sanctum')
            ->getJson('/api/support/conversations/notifications')
            ->assertStatus(200)
            ->assertJsonPath('unread_total', 2)
            ->assertJsonPath('unread_conversations', 1);
    }

    public function test_student_without_a_track_is_visible_to_both_tracks(): void
    {
        $webSupport = $this->makeSupport(['support_type' => 'web']);
        $aiSupport = $this->makeSupport(['support_type' => 'ai']);
        $student = $this->makeStudent([], ['course' => CourseType::InPerson]);
        $this->openConversation($student);

        $this->actingAs($webSupport, 'sanctum')
            ->getJson('/api/support/conversations/students')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($aiSupport, 'sanctum')
            ->getJson('/api/support/conversations/students')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_account_observer_answers_only_their_own_track(): void
    {
        $observer = $this->makeAccountObserver(['support_type' => 'ai']);
        $mine = $this->openConversation(
            $this->studentOnTrack(CourseTrack::ArtificialIntelligence),
        );
        $theirs = $this->openConversation($this->studentOnTrack(CourseTrack::Web));

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$mine->id}")
            ->assertOk();

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$theirs->id}")
            ->assertStatus(404);
    }

    public function test_account_observer_can_close_a_conversation(): void
    {
        $observer = $this->makeAccountObserver();
        $conversation = $this->openConversation(
            $this->studentOnTrack(CourseTrack::Web),
        );

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/close", [
                'closure_confirmed' => true,
                'closure_reason' => 'پایان پاسخ‌گویی',
            ])
            ->assertStatus(200);

        $this->assertTrue($conversation->fresh()->isClosed());
    }

    public function test_plain_support_can_close_a_conversation_of_their_track(): void
    {
        foreach (['web', 'ai'] as $track) {
            $support = $this->makeSupport(['support_type' => $track]);
            $conversation = $this->openConversation(
                $this->studentOnTrack($track === 'web' ? CourseTrack::Web : CourseTrack::ArtificialIntelligence),
            );

            $this->actingAs($support, 'sanctum')
                ->postJson("/api/support/conversations/{$conversation->id}/close", ['closure_confirmed' => true])
                ->assertStatus(200);

            $this->assertTrue($conversation->fresh()->isClosed());
        }
    }

    public function test_read_only_observer_can_read_but_not_close(): void
    {
        $observer = $this->makeObserver();
        $conversation = $this->openConversation(
            $this->studentOnTrack(CourseTrack::Web),
        );

        // ناظرِ فقط‌خواندنی نوع پشتیبانی ندارد، پس حسابرسی‌اش هر دو حوزه را
        // می‌بیند.
        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(200);

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/close", ['closure_confirmed' => true])
            ->assertStatus(403);

        $this->assertFalse($conversation->fresh()->isClosed());
    }

    private function studentOnTrack(CourseTrack $track): User
    {
        return $this->makeStudent([], [
            'course' => CourseType::Offline,
            'track' => $track,
        ]);
    }

    private function openConversation(User $student): Conversation
    {
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => null,
            'title' => 'گفتگوی تست',
        ]);

        $conversation->messages()->create([
            'sender_id' => $student->id,
            'actor_id' => $student->id,
            'actor_role' => ActorRole::Student->value,
            'type' => 'text',
            'body' => 'سلام',
        ]);

        return $conversation;
    }
}
