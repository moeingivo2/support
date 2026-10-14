<?php

namespace App\Support;

use App\Models\Conversation;
use App\Models\MessageRating;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * داده‌ی امتیازهای یک پشتیبان برای افزودن به گزارش فعالیت او.
 *
 * امتیازها باید به‌صورت «گفتگو به گفتگو» ذخیره و نمایش داده شوند، نه فقط
 * به‌صورت میانگین تجمیعی.
 */
class SupportRatingReport
{
    /**
     * @return Collection<int, MessageRating>
     */
    public function ratingsFor(User $support): Collection
    {
        return MessageRating::query()
            ->where('support_agent_id', $support->id)
            ->with([
                'conversation:id,title,status,closure_actor,closed_at,student_id',
                'conversation.student:id,name',
            ])
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->limit(self::MAX_ROWS)
            ->get();
    }

    /**
     * سقف ردیف‌های اکسل.
     *
     * بدون این سقف، پشتیبانی با ده‌ها هزار امتیاز باعث ساخت صدها هزار
     * مدل در حافظه و خطای کمبود حافظه در یک درخواست می‌شد.
     */
    public const MAX_ROWS = 5000;

    public function exceedsLimit(User $support): bool
    {
        return MessageRating::query()
            ->where('support_agent_id', $support->id)
            ->count() > self::MAX_ROWS;
    }

    /**
     * میانگین و تعداد امتیاز — از مقادیر ذخیره‌شده محاسبه می‌شود، نه از جمع انباشته.
     *
     * @return array{average: float|null, total: int, distribution: array<int, int>}
     */
    public function summaryFor(User $support): array
    {
        $aggregate = MessageRating::query()
            ->where('support_agent_id', $support->id)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('AVG(rating_value) as average')
            ->first();

        $total = (int) ($aggregate->total ?? 0);

        $distribution = MessageRating::query()
            ->where('support_agent_id', $support->id)
            ->selectRaw('rating_value, COUNT(*) as count')
            ->groupBy('rating_value')
            ->pluck('count', 'rating_value')
            ->all();

        $buckets = [];
        foreach ([1, 2, 3, 4, 5] as $star) {
            $buckets[$star] = (int) ($distribution[$star] ?? 0);
        }

        return [
            'average' => $total > 0 ? round((float) $aggregate->average, 2) : null,
            'total' => $total,
            'distribution' => $buckets,
        ];
    }

    /**
     * ردیف‌های آماده‌ی اکسل — یک ردیف به ازای هر گفتگوی امتیازدار.
     *
     * @return array<int, array<string, int|string|null>>
     */
    public function rowsFor(User $support): array
    {
        // گفتگو و دانشجو داخل eager-load آمده‌اند؛ نسخه‌ی قبل برای هر
        // ردیف یک Conversation::find می‌زد (1 + 2R کوئری).
        return $this->ratingsFor($support)
            ->map(function (MessageRating $rating, int $index): array {
                $conversation = $rating->conversation;

                return [
                    'index' => $index + 1,
                    'conversation_id' => $rating->conversation_id,
                    'title' => $conversation?->title ?? '—',
                    'student' => $conversation?->student?->name ?? '—',
                    'rating_value' => $rating->rating_value,
                    'stars' => str_repeat('★', $rating->rating_value)
                        .str_repeat('☆', 5 - $rating->rating_value),
                    'closure_actor' => $rating->closure_actor === 'student' ? 'دانشجو' : 'پشتیبان',
                    'status' => $conversation?->status->label() ?? '—',
                    'closed_at' => $this->format($conversation?->closed_at),
                    'submitted_at' => $this->format($rating->submitted_at),
                ];
            })
            ->all();
    }

    private function format(?CarbonInterface $date): string
    {
        return JalaliDate::formatWithTime($date);
    }
}
