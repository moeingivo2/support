<?php

namespace App\Console\Commands;

use App\Models\Conversation;
use App\Support\ConversationCloser;
use App\Support\ConversationStatus;
use App\Support\IdleConversationAutoCloser;
use Illuminate\Console\Command;

/**
 * بستنِ خودکارِ گفتگوهایی که دانشجو جوابشان را نداده است.
 *
 * از طریق زمان‌بنده اجرا می‌شود؛ اجرای دستی هم ممکن است:
 *
 *     php artisan chats:auto-close-idle
 */
class AutoCloseIdleConversations extends Command
{
    protected $signature = 'chats:auto-close-idle
                            {--dry-run : فقط گزارش کند و چیزی نبندد}';

    protected $description = 'گفتگوهای بازی که دانشجو بیش از ۱۲ ساعت جوابشان را نداده، خودکار بسته می‌شوند.';

    public function handle(IdleConversationAutoCloser $closer): int
    {
        if ($this->option('dry-run')) {
            return $this->reportDryRun();
        }

        $closed = $closer->closeIdleConversations();

        if ($closed->isEmpty()) {
            $this->info('گفتگوی بی‌جوابی برای بستن پیدا نشد.');

            return self::SUCCESS;
        }

        $this->info('گفتگوهای بسته‌شده: '.$closed->count());

        foreach ($closed as $conversation) {
            $this->line(sprintf(
                '  گفتگو #%d — دانشجو %d',
                $conversation->id,
                $conversation->student_id,
            ));
        }

        return self::SUCCESS;
    }

    /**
     * فقط نشان می‌دهد چه چیزی بسته می‌شد، بدون تغییر دیتابیس.
     */
    private function reportDryRun(): int
    {
        $threshold = now()->subHours(ConversationCloser::AUTO_CLOSE_IDLE_HOURS);

        $candidates = Conversation::query()
            ->where('status', ConversationStatus::Open->value)
            ->idleSince($threshold)
            ->with('lastMessage')
            ->orderBy('id')
            ->get();

        $wouldClose = $candidates->filter(
            fn ($conversation): bool => $conversation->awaitingStudentReply(),
        );

        $this->line('آستانه: '.$threshold->toDateTimeString());
        $this->line('گفتگوی باز و بی‌کار: '.$candidates->count());
        $this->line('بسته می‌شوند: '.$wouldClose->count());

        foreach ($wouldClose as $conversation) {
            $this->line(sprintf(
                '  گفتگو #%d — آخرین پیام از %s در %s',
                $conversation->id,
                $conversation->lastMessage?->actor_role->label() ?? '—',
                $conversation->lastMessage?->created_at?->toDateTimeString() ?? '—',
            ));
        }

        return self::SUCCESS;
    }
}
