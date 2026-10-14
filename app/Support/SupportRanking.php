<?php

namespace App\Support;

use App\Models\MessageRating;
use App\Models\User;

/**
 * رتبه‌بندی پشتیبان‌ها بر اساس امتیاز — محاسبه کاملاً سمت سرور.
 *
 * قاعده شکست تساوی (به‌ترتیب):
 *   ۱) میانگین امتیاز نزولی
 *   ۲) تعداد امتیاز نزولی
 *   ۳) آخرین فعالیت نزولی
 */
class SupportRanking
{
    public const TIE_BREAK_RULE = 'میانگین امتیاز نزولی، سپس تعداد امتیاز نزولی، سپس آخرین امتیاز نزولی';

    /**
     * نقش‌هایی که در رتبه‌بندی امتیاز شرکت می‌کنند.
     *
     * `account_observer` (پشتیبان ناظر) شیفت برمی‌دارد و گفتگوی دانشجو را
     * جواب می‌دهد و امتیازش روی `message_ratings.support_agent_id` ثبت
     * می‌شود، پس باید کنار پشتیبان‌های عادی دیده شود.
     *
     * @var array<int, string>
     */
    public const RANKED_ROLES = ['support', 'account_observer'];

    /**
     * @return array<int, array<string, mixed>>
     */
    /**
     * یک کوئری به‌جای یک کوئری به ازای هر پشتیبان.
     *
     * نسخه‌ی قبل داخل حلقه برای هر پشتیبان یک aggregate می‌زد، یعنی با
     * ۵۰ پشتیبان ۵۱ کوئری در هر بارگذاری صفحه (که هر ۱۵ ثانیه تکرار می‌شد).
     */
    public function board(): array
    {
        $rows = User::query()
            ->leftJoin('message_ratings', 'message_ratings.support_agent_id', '=', 'users.id')
            // ناظر (account_observer) هم شیفت می‌دارد، هم گفتگو را جواب می‌دهد،
            // پس رتبه‌بندی او هم مثل هر پشتیبان دیگری واقعی است. قبلاً فقط
            // ‎role = 'support'‎ فیلتر می‌شد و ناظرها بی‌صدا حذف می‌شدند.
            ->whereIn('users.role', self::RANKED_ROLES)
            ->groupBy('users.id', 'users.name', 'users.support_type')
            ->select([
                'users.id as support_agent_id',
                'users.name',
                'users.support_type',
            ])
            ->selectRaw('COUNT(message_ratings.id) as total_ratings')
            ->selectRaw('COALESCE(SUM(message_ratings.rating_value), 0) as total_sum')
            ->selectRaw('MAX(message_ratings.submitted_at) as latest_rating_at')
            ->get()
            ->map(function ($row): array {
                $total = (int) $row->total_ratings;

                return [
                    'support_agent_id' => (int) $row->support_agent_id,
                    'name' => (string) $row->name,
                    'support_type' => $row->support_type === null ? null : (string) $row->support_type,
                    'total_ratings' => $total,
                    'average_rating' => $total > 0
                        ? round((int) $row->total_sum / $total, 2)
                        : null,
                    'latest_rating_at' => $row->latest_rating_at,
                    'rank' => 0,
                ];
            })
            ->sortBy([
                // میانگین نزولی — پشتیبان‌های بدون امتیاز همیشه انتهای جدول
                fn (array $a, array $b): int => ($b['average_rating'] ?? -1) <=> ($a['average_rating'] ?? -1),
                fn (array $a, array $b): int => $b['total_ratings'] <=> $a['total_ratings'],
                fn (array $a, array $b): int => (strtotime((string) $b['latest_rating_at']) ?: 0) <=> (strtotime((string) $a['latest_rating_at']) ?: 0),
                fn (array $a, array $b): int => $a['name'] <=> $b['name'],
            ])
            ->values()
            ->map(function (array $row, int $index) {
                $row['rank'] = $index + 1;

                return $row;
            })
            ->all();

        return $rows;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function forAgent(int $agentId): ?array
    {
        foreach ($this->board() as $row) {
            if ($row['support_agent_id'] === $agentId) {
                return $row;
            }
        }

        return null;
    }

    /**
     * ردیف‌های جزئی هر امتیاز برای خروجی اکسل
     *
     * @return array<int, array<string, mixed>>
     */
    public function ratingDetails(int $agentId): array
    {
        return MessageRating::query()
            ->where('support_agent_id', $agentId)
            ->with(['student:id,name', 'conversation:id,title,status,closure_actor,closed_at'])
            ->orderByDesc('rating_value')
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn (MessageRating $rating, int $index): array => [
                'index' => $index + 1,
                'conversation_id' => $rating->conversation_id,
                'student' => $rating->student?->name ?? '—',
                'rating_value' => $rating->rating_value,
                'closure_actor' => $rating->closure_actor === 'student' ? 'دانشجو' : 'پشتیبان',
                'conversation_status' => $rating->conversation?->status?->label() ?? '—',
                'closed_at' => JalaliDate::formatWithTime($rating->conversation?->closed_at),
                'submitted_at' => JalaliDate::formatWithTime($rating->submitted_at),
            ])
            ->all();
    }

    public function totalRatings(): int
    {
        return MessageRating::query()->count();
    }
}
