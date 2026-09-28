<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendChatMessageRequest;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ObserverAccessLog;
use App\Models\StudentProfile;
use App\Support\ChatMessageSender;
use App\Support\ConversationCloser;
use App\Support\StudentProfilePayload;
use App\Support\UnsupportedAttachmentException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

/**
 * صندوق ورودی مشترک پشتیبان‌ها: همه پشتیبان‌ها همه گفتگوهای دانشجویان را می‌بینند.
 *
 * ناظر (observer) فقط‌خواندنی است: متن گفتگوها را می‌بیند اما هیچ تغییری
 * اعمال نمی‌کند و هر دسترسی او ثبت می‌شود. سوپر ادمین طبق سیاست دسترسی ندارد.
 */
class SupportChatController extends Controller
{
    public function __construct(
        private readonly ChatMessageSender $sender,
        private readonly ConversationCloser $closer,
    ) {}

    /**
     * فهرست گفتگوهای دانشجویان همراه با نشانگر خوانده‌نشده و پشتیبان مسئول
     */
    public function index(Request $request): JsonResponse
    {
        $conversations = Conversation::query()
            ->with(['student', 'support'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (Conversation $conversation): array => $this->summary($conversation));

        return response()->json([
            'data' => $conversations,
            'unread_total' => Conversation::query()->sum('unread_support_count'),
        ]);
    }

    /**
     * شمارنده‌های نوتیفیکیشن پشتیبان.
     *
     * طبق سیاست حریم خصوصی، فقط نام دانشجو و تعداد خوانده‌نشده برگردانده
     * می‌شود؛ پیش‌نمایش متن پیام هرگز در این پاسخ قرار نمی‌گیرد.
     */
    public function notifications(Request $request): JsonResponse
    {
        $latest = Conversation::query()
            ->where('unread_support_count', '>', 0)
            ->with('student')
            ->orderByDesc('last_message_at')
            ->first();

        return response()->json([
            'unread_total' => Conversation::query()->sum('unread_support_count'),
            'unread_conversations' => Conversation::query()->where('unread_support_count', '>', 0)->count(),
            'latest' => $latest ? [
                'conversation_id' => $latest->id,
                'student_name' => $latest->student?->name,
                'last_message_at' => $latest->last_message_at?->toIso8601String(),
            ] : null,
        ]);
    }

    /**
     * پیام‌های گفتگو به‌همراه اطلاعات دانشجو؛ با باز کردن گفتگو پیام‌ها خوانده می‌شوند
     */
    public function show(Request $request, int $conversation): JsonResponse
    {
        $model = $this->conversation($request, $conversation);
        $isObserver = $request->user()->isObserver();

        if ($isObserver) {
            // ناظر فقط‌خواندنی است: نه خوانده‌نشده پاک می‌شود، نه مسئولیت گفتگو جابه‌جا می‌شود
            $this->logObserverAccess($request, $model);
        } else {
            $model->update([
                'unread_support_count' => 0,
                'support_last_read_at' => now(),
                'support_id' => $request->user()->id,
            ]);

            $model->messages()->whereNull('read_at')->where('sender_id', '!=', $request->user()->id)
                ->update(['read_at' => now()]);
        }

        return response()->json([
            'data' => [
                'conversation' => $this->summary($model->fresh(['student', 'support'])),
                'profile' => $isObserver ? null : $this->studentProfile($model),
                'messages' => $model->messages()
                    ->with('sender')
                    ->orderBy('created_at')
                    ->orderBy('id')
                    ->get()
                    ->map(fn (Message $message): array => $this->messagePayload($message))
                    ->all(),
            ],
        ]);
    }

    /**
     * پاسخ پشتیبان به دانشجو؛ متن، کد بلوکی یا فایل
     */
    public function storeMessage(
        SendChatMessageRequest $request,
        int $conversation,
    ): JsonResponse {
        $model = $this->conversation($request, $conversation);

        if ($model->isClosed()) {
            return response()->json([
                'message' => 'این گفتگو بسته شده است و امکان ارسال پیام جدید نیست.',
            ], 422);
        }

        try {
            $message = $this->sender->send(
                $model,
                $request->user(),
                $request,
                $request->boolean('code_mode'),
            );
        } catch (UnsupportedAttachmentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
                'errors' => ['attachment' => [$exception->getMessage()]],
            ], 422);
        }

        return response()->json([
            'message' => 'پاسخ ارسال شد.',
            'data' => $this->messagePayload($message->load('sender')),
        ], 201);
    }

    /**
     * بستن گفتگو توسط پشتیبان — بدون الزام امتیاز.
     * برای گفتگوی باز است و تکرار درخواست بسته‌بودن را برنمی‌گرداند.
     */
    public function close(Request $request, int $conversation): JsonResponse
    {
        $model = $this->conversation($request, $conversation);

        $validated = $request->validate([
            'closure_confirmed' => ['required', 'boolean'],
            'closure_reason' => ['nullable', 'string', 'max:500'],
        ], [], [
            'closure_confirmed' => 'تایید بستن گفتگو',
            'closure_reason' => 'دلیل بستن',
        ]);

        try {
            $closed = $this->closer->closeBySupport(
                $model,
                $request->user(),
                (bool) $validated['closure_confirmed'],
            );
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        if (isset($validated['closure_reason'])) {
            $closed->update(['closure_reason' => $validated['closure_reason']]);
        }

        return response()->json([
            'message' => 'گفتگو بسته شد.',
            'data' => $this->summary($closed->fresh(['student', 'support'])),
        ]);
    }

    private function logObserverAccess(Request $request, Conversation $conversation): void
    {
        ObserverAccessLog::create([
            'observer_id' => $request->user()->id,
            'conversation_id' => $conversation->id,
            'action' => 'view_transcript',
            'ip_address' => $request->ip(),
        ]);
    }

    private function conversation(Request $request, int $conversation): Conversation
    {
        return Conversation::query()
            ->with(['student', 'support'])
            ->findOrFail($conversation);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function studentProfile(Conversation $conversation): ?array
    {
        $profile = StudentProfile::query()
            ->with(['user', 'mentor'])
            ->where('user_id', $conversation->student_id)
            ->first();

        return $profile === null ? null : StudentProfilePayload::make($profile);
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Conversation $conversation): array
    {
        $conversation->loadMissing('rating');

        return [
            'id' => $conversation->id,
            'title' => $conversation->title,
            'last_message_preview' => $conversation->last_message_preview,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'unread_count' => $conversation->unread_support_count,
            'status' => $conversation->status->value,
            'status_label' => $conversation->status->label(),
            'closure_actor' => $conversation->closure_actor,
            'closed_at' => $conversation->closed_at?->toIso8601String(),
            'closure_reason' => $conversation->closure_reason,
            'is_closed' => $conversation->isClosed(),
            // پشتیبان بعد از بستن توسط خودش، دعوت امتیازدهی را می‌بیند
            'awaiting_student_rating' => $conversation->isClosed()
                && $conversation->closure_actor === 'support'
                && $conversation->rating === null,
            'rating_value' => $conversation->rating?->rating_value,
            'student' => $conversation->student ? [
                'id' => $conversation->student->id,
                'name' => $conversation->student->name,
                'email' => $conversation->student->email,
                'phone' => $conversation->student->phone,
            ] : null,
            'support' => $conversation->support ? [
                'id' => $conversation->support->id,
                'name' => $conversation->support->name,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload(Message $message): array
    {
        return [
            'id' => $message->id,
            'type' => $message->type->value,
            'body' => $message->body,
            'language' => $message->language,
            'attachment_name' => $message->attachment_name,
            'attachment_mime' => $message->attachment_mime,
            'attachment_size' => $message->attachment_size,
            'duration_seconds' => $message->duration_seconds,
            'url' => $message->attachmentUrl(),
            'actor_role' => $message->actor_role->value,
            'actor_role_label' => $message->actor_role->label(),
            'actor_name' => $message->sender?->name,
            'is_edited' => (bool) $message->is_edited,
            'sender' => [
                'id' => $message->sender?->id,
                'name' => $message->sender?->name,
            ],
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }
}
