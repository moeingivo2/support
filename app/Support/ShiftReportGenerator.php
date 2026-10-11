<?php

namespace App\Support;

use App\Models\Message;
use App\Models\MessageRating;
use App\Models\Shift;
use App\Models\ShiftReport;

/**
 * تولید خودکار گزارش پایان شیفت از لاگ گفتگوها.
 *
 * هیچ عددی توسط پشتیبان وارد نمی‌شود؛ هر دو شاخص از رویدادهای ثبت‌شده
 * در بازه‌ی شیفت استخراج می‌شوند:
 *  - دانشجویانی که پشتیبان در بازه‌ی شیفت به آن‌ها پاسخ داده است
 *  - دانشجویانی که در بازه‌ی شیفت امتیاز کمتر از ۴ به پشتیبان داده‌اند
 */
final readonly class ShiftReportGenerator
{
    public static function generate(Shift $shift): ShiftReport
    {
        $existing = ShiftReport::query()->where('shift_id', $shift->id)->first();

        if ($existing !== null) {
            return $existing;
        }

        $from = $shift->start_time;
        $to = $shift->end_time ?? now();

        $responded = Message::query()
            ->join('conversations', 'conversations.id', '=', 'messages.conversation_id')
            ->where('messages.sender_id', $shift->user_id)
            ->where('messages.actor_role', ActorRole::Support->value)
            ->whereBetween('messages.created_at', [$from, $to])
            ->distinct()
            ->count('conversations.student_id');

        $unsatisfied = MessageRating::query()
            ->where('support_agent_id', $shift->user_id)
            ->where('rating_value', '<=', 3)
            ->whereBetween('submitted_at', [$from, $to])
            ->distinct()
            ->count('student_id');

        return ShiftReport::create([
            'shift_id' => $shift->id,
            'user_id' => $shift->user_id,
            'responded_students_count' => $responded,
            'unsatisfied_students_count' => $unsatisfied,
        ]);
    }
}
