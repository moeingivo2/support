<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageRating;
use App\Models\User;
use App\Support\ActorRole;
use App\Support\ConversationStatus;
use Tests\TestCase;

/**
 * چرخه‌ی حیات گفتگو، دروازه‌ی امتیاز و حاکمیت نقش‌ها.
 */
class ChatLifecycleTest extends TestCase
{
    public function test_support_student_filter_keeps_conversations_that_support_already_replied_to(): void
    {
        $student = $this->makeStudent();
        $support = $this->makeSupport();
        $conversation = $this->openConversation($student, $support);

        $conversation->messages()->create([
            'sender_id' => $support->id,
            'actor_id' => $support->id,
            'actor_role' => ActorRole::Support->value,
            'type' => 'text',
            'body' => 'پاسخ پشتیبان',
        ]);
        $conversation->forceFill([
            'support_id' => $support->id,
            'last_message_preview' => 'پاسخ پشتیبان',
            'last_message_at' => now(),
        ])->save();

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/support/conversations/students')
            ->assertOk()
            ->assertJsonPath('data.0.student.id', $student->id)
            ->assertJsonPath('data.0.conversations_count', 1);

        $this->actingAs($support, 'sanctum')
            ->getJson('/api/support/conversations?student_id='.$student->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $conversation->id)
            ->assertJsonPath('data.0.support.id', $support->id);
    }

    private function openConversation(User $student, ?User $support = null): Conversation
    {
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => $support?->id,
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

    // ---------------------------------------------------------------- بستن توسط دانشجو

    public function test_new_conversation_starts_open(): void
    {
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        $this->assertSame(ConversationStatus::Open, $conversation->fresh()->status);
        $this->assertTrue($conversation->fresh()->isOpen());
    }

    public function test_student_close_requires_rating_and_explicit_confirmation(): void
    {
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        // بدون تایید هشدار بستن
        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/close", [
                'rating_value' => 5,
            ])->assertStatus(422);

        // بدون امتیاز
        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/close", [
                'closure_confirmed' => true,
            ])->assertStatus(422)->assertJsonValidationErrors(['rating_value']);

        // امتیاز خارج از بازه
        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/close", [
                'rating_value' => 6,
                'closure_confirmed' => true,
            ])->assertStatus(422)->assertJsonValidationErrors(['rating_value']);

        $this->assertSame(ConversationStatus::Open, $conversation->fresh()->status);
        $this->assertDatabaseCount('message_ratings', 0);
    }

    public function test_student_close_records_rating_and_closes_conversation(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student, $support);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/close", [
                'rating_value' => 4,
                'closure_confirmed' => true,
            ])->assertStatus(200)
            ->assertJsonPath('data.conversation.status', 'closed')
            ->assertJsonPath('data.rating.rating_value', 4);

        $this->assertDatabaseHas('message_ratings', [
            'conversation_id' => $conversation->id,
            'rating_value' => 4,
            'support_agent_id' => $support->id,
            'closure_actor' => 'student',
        ]);
    }

    public function test_closing_twice_is_idempotent_and_keeps_the_first_rating(): void
    {
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        $this->actingAs($student, 'sanctum')->postJson("/api/conversations/{$conversation->id}/close", [
            'rating_value' => 5,
            'closure_confirmed' => true,
        ])->assertStatus(200);

        // درخواست تکراری نباید امتیاز دوم ثبت کند یا خطا بدهد
        $this->actingAs($student, 'sanctum')->postJson("/api/conversations/{$conversation->id}/close", [
            'rating_value' => 1,
            'closure_confirmed' => true,
        ])->assertStatus(200);

        $this->assertDatabaseCount('message_ratings', 1);
        $this->assertDatabaseHas('message_ratings', [
            'conversation_id' => $conversation->id,
            'rating_value' => 5,
        ]);
    }

    public function test_closed_conversation_rejects_new_messages(): void
    {
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        $this->actingAs($student, 'sanctum')->postJson("/api/conversations/{$conversation->id}/close", [
            'rating_value' => 3,
            'closure_confirmed' => true,
        ])->assertStatus(200);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'پیام بعدی'])
            ->assertStatus(422);

        // سهمیه هم نباید مصرف شود
        $this->assertSame(0, (int) $student->profile->fresh()->used_chats);
    }

    public function test_student_cannot_close_another_students_conversation(): void
    {
        $owner = $this->makeStudent();
        $intruder = $this->makeStudent();
        $conversation = $this->openConversation($owner);

        $this->actingAs($intruder, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/close", [
                'rating_value' => 1,
                'closure_confirmed' => true,
            ])->assertStatus(404);

        $this->assertSame(ConversationStatus::Open, $conversation->fresh()->status);
    }

    // ---------------------------------------------------------------- بستن توسط پشتیبان

    public function test_support_close_does_not_require_rating_and_creates_rating_prompt(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student, $support);

        $this->actingAs($support, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/close", [
                'closure_confirmed' => true,
            ])->assertStatus(200)
            ->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.awaiting_student_rating', true);

        $this->assertDatabaseCount('message_ratings', 0);

        // پیام سامانه برای دعوت به امتیازدهی ثبت می‌شود
        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'actor_role' => 'system',
        ]);
    }

    public function test_support_close_requires_confirmation(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student, $support);

        $this->actingAs($support, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/close", [])
            ->assertStatus(422);

        $this->assertSame(ConversationStatus::Open, $conversation->fresh()->status);
    }

    public function test_student_can_rate_after_support_closed_the_conversation(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student, $support);

        $this->actingAs($support, 'sanctum')->postJson("/api/support/conversations/{$conversation->id}/close", [
            'closure_confirmed' => true,
        ])->assertStatus(200);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/rate", ['rating_value' => 5])
            ->assertStatus(201)
            ->assertJsonPath('data.rating.rating_value', 5);

        $this->assertDatabaseHas('message_ratings', [
            'conversation_id' => $conversation->id,
            'rating_value' => 5,
            'closure_actor' => 'support',
        ]);

        // امتیاز دوم مجاز نیست
        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/rate", ['rating_value' => 1])
            ->assertStatus(422);
    }

    public function test_open_conversation_cannot_be_rated(): void
    {
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/rate", ['rating_value' => 5])
            ->assertStatus(422);
    }

    public function test_closed_conversation_rejects_support_replies(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student, $support);

        $this->actingAs($support, 'sanctum')->postJson("/api/support/conversations/{$conversation->id}/close", [
            'closure_confirmed' => true,
        ])->assertStatus(200);

        $this->actingAs($support, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'دیر شد'])
            ->assertStatus(422);
    }

    // ---------------------------------------------------------------- هویت پیام

    public function test_support_reply_records_actor_as_support_not_student(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student, $support);

        $this->actingAs($support, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'سلام، در خدمتم'])
            ->assertStatus(201)
            ->assertJsonPath('data.actor_role', 'support');

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'actor_role' => 'support',
            'actor_id' => $support->id,
        ]);
    }

    public function test_message_actor_cannot_be_rewritten_after_creation(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $student->id,
            'actor_id' => $student->id,
            'actor_role' => ActorRole::Student->value,
            'type' => 'text',
            'body' => 'متن اصلی',
        ]);

        // تلاش برای تغییر هویت ثبت‌کننده نباید اثر کند
        $message->update([
            'actor_role' => ActorRole::Support->value,
            'actor_id' => $support->id,
            'body' => 'متن ویرایش‌شده',
        ]);

        $fresh = $message->fresh();

        $this->assertSame('student', $fresh->actor_role->value);
        $this->assertSame($student->id, $fresh->actor_id);
        $this->assertSame('متن ویرایش‌شده', $fresh->body);
    }

    // ---------------------------------------------------------------- حاکمیت نقش‌ها

    public function test_observer_can_read_transcript_but_cannot_reply(): void
    {
        $observer = $this->makeObserver();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.messages');

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/messages", ['body' => 'دخالت ناظر'])
            ->assertStatus(403);
    }

    public function test_observer_reading_does_not_mutate_conversation_and_is_logged(): void
    {
        $observer = $this->makeObserver();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);
        $conversation->update(['unread_support_count' => 3]);

        $this->actingAs($observer, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(200);

        $fresh = $conversation->fresh();

        // ناظر نباید پیام‌ها را خوانده علامت بزند یا مسئولیت گفتگو را بگیرد
        $this->assertSame(3, $fresh->unread_support_count);
        $this->assertNull($fresh->support_id);
        $this->assertNull($fresh->support_last_read_at);
        $this->assertNull(Message::query()->first()->read_at);

        $this->assertDatabaseHas('observer_access_logs', [
            'observer_id' => $observer->id,
            'conversation_id' => $conversation->id,
            'action' => 'view_transcript',
        ]);
    }

    public function test_observer_is_denied_support_only_write_operations(): void
    {
        $observer = $this->makeObserver();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        $this->actingAs($observer, 'sanctum')
            ->postJson("/api/support/conversations/{$conversation->id}/close", ['closure_confirmed' => true])
            ->assertStatus(403);

        $this->assertSame(ConversationStatus::Open, $conversation->fresh()->status);
    }

    public function test_super_admin_cannot_access_conversation_transcripts(): void
    {
        $admin = $this->makeAdmin();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/support/conversations')
            ->assertStatus(403);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->assertStatus(403);
    }

    public function test_student_cannot_reach_support_endpoints(): void
    {
        $student = $this->makeStudent();

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/support/conversations')
            ->assertStatus(403);
    }

    // ---------------------------------------------------------------- اعلان صوتی

    public function test_support_notifications_never_expose_message_content(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student, $support);
        $conversation->update([
            'unread_support_count' => 4,
            'last_message_preview' => 'محرمانه: شماره کارت من ۶۰۳۷...',
        ]);

        $response = $this->actingAs($support, 'sanctum')
            ->getJson('/api/support/conversations/notifications')
            ->assertStatus(200)
            ->assertJsonPath('unread_total', 4)
            ->assertJsonPath('unread.0.student_name', $student->name);

        $body = $response->getContent();

        // اعلان فقط نام و شمارش دارد؛ نه متن پیام
        $this->assertStringNotContainsString('6037', $body);
        $this->assertStringNotContainsString('محرمانه', $body);
        $this->assertArrayNotHasKey('preview', $response->json('unread.0'));
    }

    public function test_observer_can_read_notifications(): void
    {
        $observer = $this->makeObserver();
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student);
        $conversation->update(['unread_support_count' => 2]);

        $this->actingAs($observer, 'sanctum')
            ->getJson('/api/support/conversations/notifications')
            ->assertStatus(200)
            ->assertJsonPath('unread_total', 2);
    }

    // ---------------------------------------------------------------- رتبه‌بندی

    public function test_support_ranking_is_ordered_by_average_and_admin_only(): void
    {
        $top = $this->makeSupport(['name' => 'پشتیبان برتر']);
        $middle = $this->makeSupport(['name' => 'پشتیبان میانی']);
        $none = $this->makeSupport(['name' => 'بدون امتیاز']);

        foreach ([[$top, 5], [$top, 5], [$middle, 1]] as [$agent, $value]) {
            $student = $this->makeStudent();
            $conversation = $this->openConversation($student, $agent);

            MessageRating::create([
                'conversation_id' => $conversation->id,
                'student_id' => $student->id,
                'support_agent_id' => $agent->id,
                'rating_value' => $value,
                'closure_actor' => 'student',
                'submitted_at' => now(),
            ]);
        }

        $admin = $this->makeAdmin();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/support-ranking')
            ->assertStatus(200);

        $names = array_column($response->json('data'), 'name');

        $this->assertSame('پشتیبان برتر', $names[0]);
        $this->assertSame('پشتیبان میانی', $names[1]);
        $this->assertSame('بدون امتیاز', $names[2]);

        $this->assertSame(1, $response->json('data.0.rank'));
        $this->assertEqualsWithDelta(5.0, $response->json('data.0.average_rating'), 0.001);
        $this->assertSame(2, $response->json('data.0.total_ratings'));
        $this->assertNull($response->json('data.2.average_rating'));

        // فقط سوپر ادمین
        $this->actingAs($this->makeSupport(), 'sanctum')
            ->getJson('/api/admin/support-ranking')
            ->assertStatus(403);
    }

    public function test_support_ranking_export_returns_excel_with_ranking_sheets(): void
    {
        $support = $this->makeSupport(['name' => 'پشتیبان اکسل']);
        $student = $this->makeStudent();
        $conversation = $this->openConversation($student, $support);

        MessageRating::create([
            'conversation_id' => $conversation->id,
            'student_id' => $student->id,
            'support_agent_id' => $support->id,
            'rating_value' => 5,
            'closure_actor' => 'student',
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($this->makeAdmin(), 'sanctum')
            ->get('/api/admin/support-ranking/export')
            ->assertStatus(200);

        $this->assertStringContainsString(
            'application/vnd.ms-excel',
            (string) $response->headers->get('Content-Type'),
        );

        $content = (string) $response->getContent();

        $this->assertStringContainsString('رتبه‌بندی پشتیبان‌ها', $content);
        $this->assertStringContainsString('جزئیات امتیازها', $content);
        $this->assertStringContainsString('پشتیبان اکسل', $content);
    }
}
