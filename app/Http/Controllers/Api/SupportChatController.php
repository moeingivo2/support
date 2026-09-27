<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendChatMessageRequest;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\StudentProfile;
use App\Support\ChatMessageSender;
use App\Support\StudentProfilePayload;
use App\Support\UnsupportedAttachmentException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * صندوق ورودی مشترک پشتیبان‌ها: همه پشتیبان‌ها همه گفتگوهای دانشجویان را می‌بینند.
 */
class SupportChatController extends Controller
{
    public function __construct(private readonly ChatMessageSender $sender) {}

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
     * شمارنده‌های نوتیفیکیشن پشتیبان — برای نظرسنجی دوره‌ای اعلان پیام جدید
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
                'preview' => $latest->last_message_preview,
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

        $model->update([
            'unread_support_count' => 0,
            'support_last_read_at' => now(),
            'support_id' => $request->user()->id,
        ]);

        $model->messages()->whereNull('read_at')->where('sender_id', '!=', $request->user()->id)
            ->update(['read_at' => now()]);

        return response()->json([
            'data' => [
                'conversation' => $this->summary($model->fresh(['student', 'support'])),
                'profile' => $this->studentProfile($model),
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
        return [
            'id' => $conversation->id,
            'title' => $conversation->title,
            'last_message_preview' => $conversation->last_message_preview,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'unread_count' => $conversation->unread_support_count,
            'student' => $conversation->student ? [
                'id' => $conversation->student->id,
                'name' => $conversation->student->name,
                'email' => $conversation->student->email,
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
            'sender' => [
                'id' => $message->sender?->id,
                'name' => $message->sender?->name,
            ],
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }
}
