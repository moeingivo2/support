<?php

namespace App\Support;

use App\Models\Message;
use App\Models\MessageRating;
use App\Models\Shift;
use App\Models\ShiftReport;
use Illuminate\Database\Eloquent\Builder;

/**
 * تولید و به‌روزرسانی خودکار گزارش پایان شیفت از لاگ گفتگوها.
 *
 * هیچ عددی توسط پشتیبان وارد نمی‌شود؛ هر دو شاخص از رویدادهای ثبت‌شده
 * استخراج می‌شوند:
 *  - دانشجویانی که پشتیبان در شیفت به آن‌ها پاسخ داده است
 *  - دانشجویانی که امتیازِ ناراضی‌کننده به همان پشتیبان داده‌اند و آن
 *    گفتگو در این شیفت پاسخ داده شده (نه لزوماً در بازه‌ی زمانیِ شیفت)
 */
final readonly class ShiftReportGenerator
{
    /**
     * سقف امتیازی که «ناراضی» حساب می‌شود.
     *
     * تنها تعریفِ نارضایتی در کل برنامه؛ اگر این عوض شود، هم شمارشِ
     * گزارش شیفت و هم شرطِ اجباری‌بودنِ توضیح در فرم امتیازدهی باید با
     * هم هماهنگ شوند (هر دو به همین ثابت نگاه می‌کنند).
     */
    public const UNSATISFIED_MAX_RATING = 2;

    public static function generate(Shift $shift): ShiftReport
    {
        $existing = ShiftReport::query()->where('shift_id', $shift->id)->first();

        if ($existing !== null) {
            return $existing;
        }

        $counts = self::counts($shift);

        return ShiftReport::create([
            'shift_id' => $shift->id,
            'user_id' => $shift->user_id,
            'responded_students_count' => $counts['responded'],
            'unsatisfied_students_count' => $counts['unsatisfied'],
        ]);
    }

    /**
     * شمارش را روی گزارشِ از قبل موجود تازه می‌کند.
     *
     * چرا لازم است: گزارش در لحظه‌ی پایان شیفت ساخته می‌شود، ولی
     * دانشجو ممکن است امروز یا فردا گفتگو را ببندد و امتیاز بدهد. بدون
     * این تازه‌سازی، آن نارضایتی هرگز در عددِ گزارش دیده نمی‌شد و
     * پشتیبانِ بی‌خبر از نارضایتیِ دانشجو می‌ماند.
     *
     * اگر هنوز گزارشی برای این شیفت ساخته نشده، `null` می‌دهد — شیفت
     * هنوز تمام نشده و گزارشش موقع پایان ساخته می‌شود.
     */
    public static function refresh(Shift $shift): ?ShiftReport
    {
        $report = ShiftReport::query()->where('shift_id', $shift->id)->first();

        if ($report === null) {
            return null;
        }

        $counts = self::counts($shift);

        $report->update([
            'responded_students_count' => $counts['responded'],
            'unsatisfied_students_count' => $counts['unsatisfied'],
        ]);

        return $report->refresh();
    }

    /**
     * @return array{responded: int, unsatisfied: int}
     */
    private static function counts(Shift $shift): array
    {
        return [
            'responded' => self::respondedStudentsCount($shift),
            'unsatisfied' => self::unsatisfiedQuery($shift)->distinct()->count('student_id'),
        ];
    }

    private static function respondedStudentsCount(Shift $shift): int
    {
        return Message::query()
            ->join('conversations', 'conversations.id', '=', 'messages.conversation_id')
            ->where('messages.sender_id', $shift->user_id)
            ->where('messages.actor_role', ActorRole::Support->value)
            ->whereBetween('messages.created_at', [$shift->start_time, $shift->end_time ?? now()])
            ->distinct()
            ->count('conversations.student_id');
    }

    /**
     * فهرست امتیازهای ناراضی‌کننده‌ی نسبت‌داده‌شده به یک شیفت.
     *
     * امتیازهایی که به همین شیفت نسبت داده شده‌اند هر زمان که ثبت شده
     * باشند شمرده می‌شوند — حتی بعد از پایان شیفت. شرط ‎OR‎ فقط برای
     * ردیف‌های قدیمی است که پیش از اضافه‌شدن ستون ‎shift_id‎ ثبت شده‌اند:
     * آن‌ها با بازه‌ی زمانیِ ارسال تطبیق داده می‌شوند تا عددشان از دست
     * نرود.
     *
     * @return Builder<MessageRating>
     */
    public static function unsatisfiedQuery(Shift $shift): Builder
    {
        $from = $shift->start_time;
        $to = $shift->end_time ?? now();

        return MessageRating::query()
            ->where('support_agent_id', $shift->user_id)
            ->where('rating_value', '<=', self::UNSATISFIED_MAX_RATING)
            ->where(function ($query) use ($shift, $from, $to): void {
                $query->where('shift_id', $shift->id)
                    ->orWhere(function ($legacy) use ($from, $to): void {
                        $legacy->whereNull('shift_id')
                            ->whereBetween('submitted_at', [$from, $to]);
                    });
            });
    }
}
