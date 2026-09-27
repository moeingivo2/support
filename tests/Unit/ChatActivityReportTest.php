<?php

namespace Tests\Unit;

use App\Models\Conversation;
use App\Support\ChatActivityReport;
use Tests\TestCase;

class ChatActivityReportTest extends TestCase
{
    public function test_it_summarises_conversations_inside_a_shift_window(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent([], ['course' => 'offline', 'track' => 'ai']);

        $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now()->subHours(4),
            'end_time' => null,
            'status' => 'active',
        ]);

        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => $support->id,
        ]);
        $conversation->messages()->create([
            'sender_id' => $student->id,
            'type' => 'text',
            'body' => 'سلام',
        ]);
        $conversation->messages()->create([
            'sender_id' => $support->id,
            'type' => 'code',
            'body' => 'print(1)',
        ]);

        $report = ChatActivityReport::forShifts(
            $support,
            $support->shifts()->get(),
            now()->startOfDay(),
            now()->endOfDay(),
        );

        $this->assertSame(1, $report->conversationsCount);
        $this->assertSame(1, $report->studentsCount);
        $this->assertSame(1, $report->studentMessagesCount);
        $this->assertSame(1, $report->supportMessagesCount);
        $this->assertCount(1, $report->conversationRows);
        $this->assertSame('هوش مصنوعی', $report->conversationRows[0]['track']);
    }

    public function test_it_buckets_messages_into_the_matching_shift_window(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();

        $shift = $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now()->subHours(4),
            'end_time' => null,
            'status' => 'active',
        ]);

        $conversation = Conversation::create([
            'student_id' => $student->id,
            'support_id' => $support->id,
        ]);
        $conversation->messages()->create([
            'sender_id' => $student->id,
            'type' => 'text',
            'body' => 'سلام',
        ]);
        $conversation->messages()->create([
            'sender_id' => $support->id,
            'type' => 'code',
            'body' => 'print(1)',
        ]);

        $report = ChatActivityReport::forShifts(
            $support,
            $support->shifts()->get(),
            now()->startOfDay(),
            now()->endOfDay(),
        );

        $this->assertSame(
            ['conversations' => 1, 'student_messages' => 1, 'support_messages' => 1, 'students' => 1],
            $report->forShift($shift->id),
        );
    }

    public function test_it_ignores_conversations_outside_the_shift_windows(): void
    {
        $support = $this->makeSupport();
        $student = $this->makeStudent();

        $shift = $support->shifts()->create([
            'channel' => 'web',
            'start_time' => now()->subHours(4),
            'end_time' => now()->subHour(),
            'status' => 'ended',
        ]);

        Conversation::create(['student_id' => $student->id, 'support_id' => $support->id]);

        $report = ChatActivityReport::forShifts(
            $support,
            $support->shifts()->get(),
            now()->startOfDay(),
            now()->endOfDay(),
        );

        $this->assertSame(1, $report->conversationsCount);
        $this->assertSame(
            ['conversations' => 0, 'student_messages' => 0, 'support_messages' => 0, 'students' => 0],
            $report->forShift($shift->id),
        );
    }

    public function test_it_returns_zeroed_metrics_for_an_unknown_shift(): void
    {
        $support = $this->makeSupport();

        $report = ChatActivityReport::forShifts(
            $support,
            $support->shifts()->get(),
            now()->startOfDay(),
            now()->endOfDay(),
        );

        $this->assertSame(
            ['conversations' => 0, 'student_messages' => 0, 'support_messages' => 0, 'students' => 0],
            $report->forShift(9999),
        );
        $this->assertSame([], $report->conversationRows);
        $this->assertSame(0.0, $report->averageFirstResponseMinutes);
    }
}
