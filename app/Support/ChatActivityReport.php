<?php

namespace App\Support;

use App\Models\Complaint;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Shift;
use App\Models\StudentProfile;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * محاسبه آمار گفتگوی یک پشتیبان در یک بازه زمانی، هم به‌صورت کلی و هم تفکیک‌شده
 * روی شیفت‌های همان پشتیبان.
 */
final readonly class ChatActivityReport
{
    private const MAX_MESSAGES = 50000;

    /**
     * @param  array<int, array{conversations: int, student_messages: int, support_messages: int, students: int}>  $shiftMetrics
     * @param  array<int, array<string, mixed>>  $conversationRows
     */
    private function __construct(
        public int $conversationsCount,
        public int $studentsCount,
        public int $unsatisfiedStudentsCount,
        public int $studentMessagesCount,
        public int $supportMessagesCount,
        public float $averageFirstResponseMinutes,
        public array $shiftMetrics,
        public array $conversationRows,
    ) {}

    /**
     * @param  Collection<int, Shift>  $shifts
     */
    public static function forShifts(
        User $support,
        Collection $shifts,
        CarbonInterface $from,
        CarbonInterface $to,
    ): self {
        $conversations = Conversation::query()
            ->with(['student'])
            ->where('support_id', $support->id)
            ->whereBetween('created_at', [$from, $to])
            ->orderBy('created_at')
            ->get();

        $messages = $conversations->isEmpty()
            ? collect()
            : Message::query()
                ->whereIn('conversation_id', $conversations->pluck('id'))
                ->whereBetween('created_at', [$from, $to])
                ->orderBy('created_at')
                ->limit(self::MAX_MESSAGES)
                ->get(['conversation_id', 'sender_id', 'created_at']);

        $studentIdsByConversation = $conversations
            ->mapWithKeys(fn (Conversation $conversation): array => [$conversation->id => $conversation->student_id])
            ->all();

        $shiftMetrics = self::bucketByShift($shifts, $conversations, $messages, $studentIdsByConversation);

        $responseMinutes = self::firstResponseMinutes($conversations, $messages, $support->id);

        $conversationRows = self::conversationRows($conversations, $messages, $studentIdsByConversation, $support);

        return new self(
            conversationsCount: $conversations->count(),
            studentsCount: $conversations->pluck('student_id')->unique()->count(),
            unsatisfiedStudentsCount: Complaint::query()
                ->where('support_id', $support->id)
                ->whereBetween('created_at', [$from, $to])
                ->distinct()
                ->count('student_id'),
            studentMessagesCount: $messages->filter(
                fn (Message $message): bool => ($studentIdsByConversation[$message->conversation_id] ?? null) === $message->sender_id,
            )->count(),
            supportMessagesCount: $messages->where('sender_id', $support->id)->count(),
            averageFirstResponseMinutes: $responseMinutes === []
                ? 0.0
                : round(array_sum($responseMinutes) / count($responseMinutes), 2),
            shiftMetrics: $shiftMetrics,
            conversationRows: $conversationRows,
        );
    }

    /**
     * @return array{conversations: int, student_messages: int, support_messages: int, students: int}
     */
    public function forShift(int $shiftId): array
    {
        return $this->shiftMetrics[$shiftId] ?? [
            'conversations' => 0,
            'student_messages' => 0,
            'support_messages' => 0,
            'students' => 0,
        ];
    }

    /**
     * @param  Collection<int, Shift>  $shifts
     * @param  Collection<int, Conversation>  $conversations
     * @param  Collection<int, Message>  $messages
     * @param  array<int, int>  $studentIdsByConversation
     * @return array<int, array{conversations: int, student_messages: int, support_messages: int, students: int}>
     */
    private static function bucketByShift(
        Collection $shifts,
        Collection $conversations,
        Collection $messages,
        array $studentIdsByConversation,
    ): array {
        $windows = $shifts
            ->filter(fn (Shift $shift): bool => $shift->start_time !== null)
            ->sortBy('start_time')
            ->values()
            ->map(fn (Shift $shift): array => [
                'id' => $shift->id,
                'start' => $shift->start_time,
                'end' => $shift->end_time ?? now(),
            ])
            ->all();

        $metrics = [];

        foreach ($windows as $window) {
            $metrics[$window['id']] = [
                'conversations' => 0,
                'student_messages' => 0,
                'support_messages' => 0,
                'students' => [],
            ];
        }

        if ($metrics === []) {
            return [];
        }

        foreach ($conversations as $conversation) {
            $index = self::findWindow($windows, $conversation->created_at);

            if ($index !== null) {
                $metrics[$windows[$index]['id']]['conversations']++;
                $metrics[$windows[$index]['id']]['students'][(int) $conversation->student_id] = true;
            }
        }

        foreach ($messages as $message) {
            $index = self::findWindow($windows, $message->created_at);

            if ($index === null) {
                continue;
            }

            $isStudentMessage = ($studentIdsByConversation[$message->conversation_id] ?? null) === $message->sender_id;

            $metrics[$windows[$index]['id']][$isStudentMessage ? 'student_messages' : 'support_messages']++;
        }

        return array_map(static function (array $metric): array {
            $metric['students'] = count($metric['students']);

            return $metric;
        }, $metrics);
    }

    /**
     * شیفتی که بازه زمانی‌اش شامل لحظه داده‌شده است
     *
     * @param  array<int, array{id: int, start: CarbonInterface, end: CarbonInterface}>  $windows
     */
    private static function findWindow(array $windows, ?CarbonInterface $moment): ?int
    {
        if ($moment === null) {
            return null;
        }

        $low = 0;
        $high = count($windows) - 1;
        $candidate = null;

        while ($low <= $high) {
            $mid = intdiv($low + $high, 2);

            if ($windows[$mid]['start']->lte($moment)) {
                $candidate = $mid;
                $low = $mid + 1;
            } else {
                $high = $mid - 1;
            }
        }

        // شیفت‌ها معمولاً هم‌پوشانی ندارند؛ برای اطمینان چند شیفت قبلی هم بررسی می‌شود
        for ($i = $candidate; $i !== null && $i >= 0 && $i > $candidate - 10; $i--) {
            if ($windows[$i]['start']->lte($moment) && $windows[$i]['end']->gte($moment)) {
                return $i;
            }
        }

        return null;
    }

    /**
     * @param  Collection<int, Conversation>  $conversations
     * @param  Collection<int, Message>  $messages
     * @return array<int, int>
     */
    private static function firstResponseMinutes(
        Collection $conversations,
        Collection $messages,
        int $supportId,
    ): array {
        if ($conversations->isEmpty()) {
            return [];
        }

        $firstStudentMessage = [];
        $firstSupportMessage = [];

        foreach ($messages as $message) {
            if ($message->sender_id === $supportId) {
                $firstSupportMessage[$message->conversation_id] ??= $message->created_at;
            } else {
                $firstStudentMessage[$message->conversation_id] ??= $message->created_at;
            }
        }

        $durations = [];

        foreach ($firstStudentMessage as $conversationId => $askedAt) {
            $answeredAt = $firstSupportMessage[$conversationId] ?? null;

            if ($answeredAt === null || $answeredAt->lt($askedAt)) {
                continue;
            }

            $durations[] = max(0, (int) $askedAt->diffInMinutes($answeredAt));
        }

        return $durations;
    }

    /**
     * @param  Collection<int, Conversation>  $conversations
     * @param  Collection<int, Message>  $messages
     * @param  array<int, int>  $studentIdsByConversation
     * @return array<int, array<string, mixed>>
     */
    private static function conversationRows(
        Collection $conversations,
        Collection $messages,
        array $studentIdsByConversation,
        User $support,
    ): array {
        if ($conversations->isEmpty()) {
            return [];
        }

        $studentMessages = [];
        $supportMessages = [];
        $lastMessageAt = [];

        foreach ($messages as $message) {
            $isStudentMessage = ($studentIdsByConversation[$message->conversation_id] ?? null) === $message->sender_id;

            if ($isStudentMessage) {
                $studentMessages[$message->conversation_id] = ($studentMessages[$message->conversation_id] ?? 0) + 1;
            } else {
                $supportMessages[$message->conversation_id] = ($supportMessages[$message->conversation_id] ?? 0) + 1;
            }

            $lastMessageAt[$message->conversation_id] = $message->created_at;
        }

        $profileCache = [];

        return $conversations
            ->map(function (Conversation $conversation, int $index) use (
                $support,
                $studentMessages,
                $supportMessages,
                $lastMessageAt,
                &$profileCache,
            ): array {
                $profile = $profileCache[$conversation->student_id] ??= StudentProfile::query()
                    ->where('user_id', $conversation->student_id)
                    ->first();

                $startedAt = $conversation->created_at;
                $endedAt = $lastMessageAt[$conversation->id] ?? $startedAt;

                return [
                    'index' => $index + 1,
                    'support' => $support->name,
                    'student' => $conversation->student?->name ?? '—',
                    'course' => $profile?->course->label() ?? '—',
                    'track' => $profile?->track?->label() ?? '—',
                    'date' => $startedAt->format('Y-m-d'),
                    'started_at' => $startedAt->format('H:i'),
                    'ended_at' => $endedAt->format('H:i'),
                    'duration_minutes' => max(0, (int) $startedAt->diffInMinutes($endedAt)),
                    'student_messages' => $studentMessages[$conversation->id] ?? 0,
                    'support_messages' => $supportMessages[$conversation->id] ?? 0,
                    'status' => $conversation->unread_student_count > 0 ? 'در انتظار پاسخ دانشجو' : 'پاسخ داده شده',
                ];
            })
            ->all();
    }
}
