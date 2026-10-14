<?php

namespace App\Support;

use App\Models\Conversation;
use App\Models\Shift;
use Illuminate\Support\Carbon;

/**
 * نسبت دادن یک گفتگو به شیفتی که واقعاً در آن به دانشجو پاسخ داده شده.
 *
 * چرا این مهم است: دانشجو ممکن است فردای آن روز گفتگو را ببندد و امتیاز
 * بدهد، در حالی که شیفت پشتیبان دیروز تمام شده و امروز شیفت دیگری است.
 * اگر امتیاز را با «زمان ارسال» بسنجیم (کاری که نسخه‌ی قبل می‌کرد)، امتیاز
 * به هیچ شیفتی نمی‌افتد و نارضایتی در گزارش شیفت گم می‌شود — یا بدتر،
 * به شیفت اشتباهِ امروز می‌افتد.
 *
 * مبنا این است: **آخرین پیامی که پشتیبان در آن گفتگو داده**، نه لحظه‌ی
 * ثبت امتیاز.
 */
final readonly class ShiftAttribution
{
    /**
     * شیفتِ پشتیبان که بازه‌اش آخرین پاسخ او به دانشجو را در بر می‌گیرد.
     *
     * اگر آخرین پاسخِ پشتیبان پیدا نشود (گفتگو هنوز بی‌پاسخ است) به
     * آخرین پیامِ گفتگو و سپس به زمان ایجاد گفتگو عقب می‌رود، تا
     * نارضایتیِ ثبت‌شده هیچ‌وقت بی‌شیفت رها نشود.
     */
    public static function forConversation(Conversation $conversation): ?Shift
    {
        $supportId = $conversation->support_id;

        if ($supportId === null) {
            return null;
        }

        foreach (self::candidateMoments($conversation) as $moment) {
            $shift = self::shiftCovering($moment, $supportId);

            if ($shift !== null) {
                return $shift;
            }
        }

        return null;
    }

    /**
     * لحظه‌هایی که به‌ترتیب اولویت امتحان می‌شوند.
     *
     * @return array<int, Carbon>
     */
    private static function candidateMoments(Conversation $conversation): array
    {
        $moments = [];

        $lastSupportReply = $conversation->messages()
            ->where('sender_id', $conversation->support_id)
            ->orderByDesc('created_at')
            ->max('created_at');

        if ($lastSupportReply !== null) {
            $moments[] = Carbon::parse($lastSupportReply);
        }

        if ($conversation->last_message_at !== null) {
            $moments[] = Carbon::parse($conversation->last_message_at);
        }

        if ($conversation->created_at !== null) {
            $moments[] = Carbon::parse($conversation->created_at);
        }

        return $moments;
    }

    /**
     * شیفتی از `userId` که لحظه‌ی داده‌شده داخل بازه‌اش باشد.
     *
     * شیفتِ باز (`status = active`) ‎end_time = null‎ دارد و تا «همین
     * حالا» باز است؛ شیفتِ بسته با ‎end_time‎ خودش بسته می‌شود.
     */
    private static function shiftCovering(Carbon $moment, int $userId): ?Shift
    {
        return Shift::query()
            ->where('user_id', $userId)
            ->where('start_time', '<=', $moment)
            ->where(function ($query) use ($moment): void {
                $query->whereNull('end_time')
                    ->orWhere('end_time', '>=', $moment);
            })
            // آخرین شیفتِ باز/بسته‌ای که این لحظه در آن است؛ اگر هم‌پوشانی
            // نادر وجود داشته باشد، شیفتِ دیرتر انتخاب می‌شود.
            ->orderByDesc('start_time')
            ->first();
    }
}
