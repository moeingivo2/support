<?php

namespace App\Support;

use App\Models\Conversation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * بستنِ خودکارِ گفتگوهایی که دانشجو جوابشان را نداده است.
 *
 * شرط، دقیقاً «بی‌جواب ماندنِ دانشجو» است و نه صرفاً «بی‌کاری»:
 *  - گفتگو باید باز باشد.
 *  - از آخرین پیام (یا ساختِ گفتگو) بیشتر از سقف ساعت گذشته باشد.
 *  - آخرین پیام نباید از دانشجو باشد؛ اگر دانشجو آخرین حرف را زده باشد،
 *    نوبتِ پشتیبان است و بستنِ خودکار اشتباه می‌شود.
 *  - گفتگوی بدون هیچ پیامی بسته نمی‌شود؛ ساخته‌شدنِ گفتگو و بی‌جواب‌ماندنِ
 *    آن تقصیرِ پشتیبان است، نه دانشجو.
 *
 * هیچ امتیازی خودکار ثبت نمی‌شود؛ دانشجو بعداً می‌تواند از داخل گفتگوی
 * بسته امتیاز بدهد.
 */
final class IdleConversationAutoCloser
{
    /**
     * @return Collection<int, Conversation> گفتگوهایی که همین حالا بسته شدند
     */
    public function closeIdleConversations(?Carbon $now = null): Collection
    {
        $now = $now ?? now();
        $threshold = $now->copy()->subHours(ConversationCloser::AUTO_CLOSE_IDLE_HOURS);

        $candidates = Conversation::query()
            ->where('status', ConversationStatus::Open->value)
            ->idleSince($threshold)
            ->with('lastMessage')
            ->orderBy('id')
            ->get();

        $closer = app(ConversationCloser::class);
        $closed = new Collection;

        foreach ($candidates as $conversation) {
            if (! $conversation->awaitingStudentReply()) {
                continue;
            }

            $closed->push($closer->closeAutomatically($conversation));
        }

        return $closed;
    }
}
