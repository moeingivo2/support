<?php

namespace App\Support;

use App\Models\Message;
use App\Models\MessageRating;
use App\Models\Shift;
use App\Models\ShiftReport;
use Illuminate\Database\Eloquent\Builder;

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

        // امتیازهایی که به همین شیفت نسبت داده شده‌اند، هر زمان که ثبت
        // شده باشند شمرده می‌شوند. شرط ‎OR‎ فقط برای ردیف‌های قدیمی است که
        // پیش از اضافه‌شدن ستون ‎shift_id‎ ثبت شده‌اند: آن‌ها با بازه‌ی
        // زمانیِ ارسال تطبیق داده می‌شوند تا عددشان از دست نرود.
        $unsatisfied = MessageRating::query()
            ->where('support_agent_id', $shift->user_id)
            ->where('rating_value', '<=', 3)
            ->where(function ($query) use ($shift, $from, $to): void {
                $query->where('shift_id', $shift->id)
                    ->orWhere(function ($legacy) use ($from, $to): void {
                        $legacy->whereNull('shift_id')
                            ->whereBetween('submitted_at', [$from, $to]);
                    });
            })
            ->distinct()
            ->count('student_id');

        return ShiftReport::create([
            'shift_id' => $shift->id,
            'user_id' => $shift->user_id,
            'responded_students_count' => $responded,
            'unsatisfied_students_count' => $unsatisfied,
        ]);
    }

    /**
     * فهرست گفتگوهای ناراضیِ نسبت‌داده‌شده به یک شیفت.
     *
     * @return Builder<MessageRating>
     */
    public static function unsatisfiedQuery(Shift $shift)
    {
        $from = $shift->start_time;
        $to = $shift->end_time ?? now();

        return MessageRating::query()
            ->where('support_agent_id', $shift->user_id)
            ->where('rating_value', '<=', 3)
            ->where(function ($query) use ($shift, $from, $to): void {
                $query->where('shift_id', $shift->id)
                    ->orWhere(function ($legacy) use ($from, $to): void {
                        $legacy->whereNull('shift_id')
                            ->whereBetween('submitted_at', [$from, $to]);
                    });
            });
    }
}
