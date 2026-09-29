<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageRating;
use App\Models\StudentProfile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * اندازه‌گیری واقعی تعداد کوئری روی مسیرهای داغ.
 *
 * این تست‌ها عدد کوئری را می‌سنجند تا رگرسیون N+1 دوباره وارد نشود.
 */
class QueryBudgetTest extends TestCase
{
    private function countQueries(callable $callback): int
    {
        DB::enableQueryLog();
        DB::flushQueryLog();

        $callback();

        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    }

    public function test_support_inbox_query_count_is_flat_not_one_per_conversation(): void
    {
        $support = $this->makeSupport();

        for ($i = 0; $i < 20; $i++) {
            $student = $this->makeStudent();
            $conversation = Conversation::create([
                'student_id' => $student->id,
                'support_id' => $support->id,
                'title' => 'گفتگو '.$i,
                'last_message_at' => now()->subMinutes($i),
            ]);

            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $student->id,
                'actor_role' => 'student',
                'type' => 'text',
                'body' => 'سلام',
            ]);

            if ($i % 3 === 0) {
                MessageRating::create([
                    'conversation_id' => $conversation->id,
                    'student_id' => $student->id,
                    'support_agent_id' => $support->id,
                    'rating_value' => 5,
                    'closure_actor' => 'student',
                    'submitted_at' => now(),
                ]);
            }
        }

        $queries = $this->countQueries(function () use ($support) {
            $this->actingAs($support, 'sanctum')->getJson('/api/support/conversations');
        });

        // قبلاً 3 + N (یک کوئری rating برای هر ردیف) + 1 بود.
        $this->assertLessThanOrEqual(
            6,
            $queries,
            "صندوق ورودی با {$queries} کوئری پاس داد؛ انتظار حداکثر ۶ کوئری مستقل از تعداد گفتگو بود.",
        );
    }

    public function test_student_conversation_list_query_count_is_flat(): void
    {
        $student = $this->makeStudent();
        $support = $this->makeSupport();

        for ($i = 0; $i < 20; $i++) {
            $conversation = Conversation::create([
                'student_id' => $student->id,
                'support_id' => $support->id,
                'title' => 'گفتگو '.$i,
                'last_message_at' => now()->subMinutes($i),
            ]);

            MessageRating::create([
                'conversation_id' => $conversation->id,
                'student_id' => $student->id,
                'support_agent_id' => $support->id,
                'rating_value' => 4,
                'closure_actor' => 'student',
                'submitted_at' => now(),
            ]);
        }

        $queries = $this->countQueries(function () use ($student) {
            $this->actingAs($student, 'sanctum')->getJson('/api/conversations');
        });

        $this->assertLessThanOrEqual(
            5,
            $queries,
            "فهرست گفتگو با {$queries} کوئری پاس داد؛ انتظار حداکثر ۵ کوئری بود.",
        );
    }

    public function test_ranking_board_uses_a_single_query_regardless_of_agent_count(): void
    {
        $agents = [];

        for ($i = 0; $i < 15; $i++) {
            $agent = $this->makeSupport(['name' => 'پشتیبان '.$i]);
            $agents[] = $agent;

            $student = $this->makeStudent();
            $conversation = Conversation::create([
                'student_id' => $student->id,
                'support_id' => $agent->id,
                'title' => 'گفتگو',
                'status' => 'closed',
                'closure_actor' => 'student',
                'closed_by' => $student->id,
                'closed_at' => now(),
            ]);

            MessageRating::create([
                'conversation_id' => $conversation->id,
                'student_id' => $student->id,
                'support_agent_id' => $agent->id,
                'rating_value' => ($i % 5) + 1,
                'closure_actor' => 'student',
                'submitted_at' => now(),
            ]);
        }

        $admin = $this->makeAdmin();

        $queries = $this->countQueries(function () use ($admin) {
            $this->actingAs($admin, 'sanctum')->getJson('/api/admin/support-ranking');
        });

        // قبلاً 1 + N + 1 بود (۱۷ کوئری برای ۱۵ پشتیبان).
        $this->assertLessThanOrEqual(
            4,
            $queries,
            "رتبه‌بندی با {$queries} کوئری پاس داد؛ انتظار حداکثر ۴ کوئری مستقل از تعداد پشتیبان بود.",
        );
    }

    public function test_conversation_list_is_bounded(): void
    {
        $student = $this->makeStudent();

        for ($i = 0; $i < 60; $i++) {
            Conversation::create([
                'student_id' => $student->id,
                'title' => 'گفتگو '.$i,
                'last_message_at' => now()->subMinutes($i),
            ]);
        }

        $count = $this->actingAs($student, 'sanctum')
            ->getJson('/api/conversations')
            ->json('data');

        $this->assertLessThanOrEqual(
            100,
            count($count),
            'فهرست گفتگو باید سقف داشته باشد.',
        );
    }

    public function test_support_transcript_is_bounded(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => $support->id,
            'title' => 'گفتگوی طولانی',
        ]);

        for ($i = 0; $i < 250; $i++) {
            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $student->id,
                'actor_role' => 'student',
                'type' => 'text',
                'body' => 'پیام '.$i,
            ]);
        }

        $messages = $this->actingAs($support, 'sanctum')
            ->getJson("/api/support/conversations/{$conversation->id}")
            ->json('data.messages');

        $this->assertLessThanOrEqual(
            150,
            count($messages),
            'ترنسکریپت باید سقف داشته باشد تا حافظه سرور پر نشود.',
        );
    }

    public function test_unread_counter_increments_correctly_on_repeated_reads(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => $support->id,
            'title' => 'گفتگو',
        ]);

        for ($i = 0; $i < 3; $i++) {
            Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $student->id,
                'actor_role' => 'student',
                'type' => 'text',
                'body' => 'پیام '.$i,
            ]);

            $this->actingAs($student, 'sanctum')
                ->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'تأیید'])
                ->assertStatus(201);
        }

        $this->assertSame(
            3,
            (int) $conversation->fresh()->unread_support_count,
            'شمارنده‌ی خوانده‌نشده باید دقیقاً به اندازه‌ی پیام‌های دانشجو بالا برود.',
        );
    }

    public function test_chat_quota_is_not_overdrawn_by_repeated_sends(): void
    {
        // سهمیه‌ی ۱: باید فقط یک پیام مجاز باشد
        $student = $this->makeStudent([], ['total_chats' => 1, 'used_chats' => 0]);
        $conversation = Conversation::create([
            'student_id' => $student->id,
            'title' => 'گفتگو',
        ]);

        $first = $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'اول']);

        $second = $this->actingAs($student, 'sanctum')
            ->postJson("/api/conversations/{$conversation->id}/messages", ['body' => 'دوم']);

        $this->assertSame(201, $first->status());
        $this->assertSame(422, $second->status(), 'پیام دوم نباید با سهمیه‌ی یک ارسال می‌شد.');

        $this->assertSame(
            1,
            (int) StudentProfile::query()->where('user_id', $student->id)->value('used_chats'),
            'used_chats نباید از total_chats بیشتر شود.',
        );
    }
}
