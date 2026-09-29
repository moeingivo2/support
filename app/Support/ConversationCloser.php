<?php

namespace App\Support;

use App\Models\Conversation;
use App\Models\MessageRating;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * چرخه‌ی حیات گفتگو: open → closing_pending_rating → closed
 * بستن، برگشت‌ناپذیر است و هرگز به‌طور خودکار باز نمی‌شود.
 */
class ConversationCloser
{
    /**
     * بستن گفتگو توسط دانشجو — امتیاز الزامی است.
     *
     * @throws RuntimeException اگر امتیاز نامعتبر باشد یا امتیاز تکراری ثبت شود
     */
    public function closeByStudent(
        Conversation $conversation,
        User $student,
        int $ratingValue,
        bool $closureReasonConfirmed = false,
    ): Conversation {
        if (! $closureReasonConfirmed) {
            throw new RuntimeException('تایید هشدار بستن گفتگو الزامی است.');
        }

        return $this->finalize(
            conversation: $conversation,
            closureActor: 'student',
            rating: ['value' => $ratingValue, 'student' => $student],
        );
    }

    /**
     * بستن گفتگو توسط پشتیبان — بدون امتیاز فوری.
     * دانشجو بعداً از طریق دعوتِ داخل گفتگوی بسته می‌تواند امتیاز بدهد.
     */
    public function closeBySupport(Conversation $conversation, User $support, bool $confirmed): Conversation
    {
        if (! $confirmed) {
            throw new RuntimeException('تایید بستن گفتگو الزامی است.');
        }

        return $this->finalize(
            conversation: $conversation,
            closureActor: 'support',
            rating: null,
            actor: $support,
        );
    }

    /**
     * ثبت امتیاز پس از بستن (برای بستن توسط پشتیبان)
     *
     * @throws RuntimeException
     */
    public function rateClosedConversation(Conversation $conversation, User $student, int $ratingValue): MessageRating
    {
        if (! $conversation->isClosed()) {
            throw new RuntimeException('تنها گفتگوی بسته‌شده قابل امتیازدهی است.');
        }

        if ($conversation->student_id !== $student->id) {
            throw new RuntimeException('دسترسی غیرمجاز');
        }

        $this->assertRatingValue($ratingValue);

        if ($conversation->rating()->exists()) {
            throw new RuntimeException('برای این گفتگو قبلاً امتیاز ثبت شده است.');
        }

        return $this->storeRating($conversation, $student, $ratingValue, $conversation->closure_actor);
    }

    /**
     * هسته‌ی بستن — در برابر درخواست‌های همزمان idempotent است.
     */
    private function finalize(
        Conversation $conversation,
        string $closureActor,
        ?array $rating,
        ?User $actor = null,
    ): Conversation {
        // بستن idempotent: اگر قبلاً بسته شده، وضعیت فعلی برگردانده می‌شود
        if ($conversation->isClosed()) {
            return $conversation;
        }

        return DB::transaction(function () use ($conversation, $closureActor, $rating, $actor) {
            $fresh = Conversation::query()->lockForUpdate()->findOrFail($conversation->id);

            if ($fresh->isClosed()) {
                return $fresh;
            }

            // مسیر «در انتظار امتیاز» فقط برای بستن توسط دانشجو معنی دارد،
            // اما چون همان تراکنش امتیاز را ثبت می‌کند، مستقیم به closed می‌رویم.
            if ($rating !== null) {
                $this->assertRatingValue($rating['value']);
                $this->storeRating($fresh, $rating['student'], $rating['value'], $closureActor);
            }

            $fresh->update([
                'status' => ConversationStatus::Closed->value,
                'closure_actor' => $closureActor,
                'closed_by' => $actor?->id ?? $conversation->student_id,
                'closed_at' => now(),
            ]);

            // پیام سامانه برای دعوت به امتیازدهی (فقط وقتی دانشجو هنوز امتیاز نداده)
            if ($closureActor === 'support' && ! $fresh->rating()->exists()) {
                $fresh->messages()->create([
                    'sender_id' => null,
                    'actor_id' => null,
                    'actor_role' => ActorRole::System->value,
                    'type' => MessageType::Text->value,
                    'body' => 'این گفتگو توسط پشتیبان بسته شد. اگر از پاسخ‌گویی راضی بودید، می‌توانید امتیاز بدهید.',
                ]);
            }

            return $fresh->refresh();
        });
    }

    /**
     * @throws RuntimeException
     */
    private function storeRating(
        Conversation $conversation,
        User $student,
        int $value,
        ?string $closureActor,
    ): MessageRating {
        return MessageRating::create([
            'conversation_id' => $conversation->id,
            'student_id' => $student->id,
            'support_agent_id' => $conversation->support_id,
            'rating_value' => $value,
            'closure_actor' => $closureActor,
            'submitted_at' => now(),
        ]);
    }

    /**
     * @throws RuntimeException
     */
    private function assertRatingValue(int $value): void
    {
        if ($value < 1 || $value > 5) {
            throw new RuntimeException('امتیاز باید بین ۱ تا ۵ باشد.');
        }
    }
}
