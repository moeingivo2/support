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

class ConversationController extends Controller
{
    public function __construct(private readonly ChatMessageSender $sender) {}

    /**
     * فهرست گفتگوهای دانشجو به‌همراه آخرین پیام و تعداد خوانده‌نشده
     */
    public function index(Request $request): JsonResponse
    {
        $conversations = Conversation::query()
            ->where('student_id', $request->user()->id)
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Conversation $conversation): array => $this->summary($conversation));

        return response()->json(['data' => $conversations]);
    }

    /**
     * شروع گفتگوی جدید
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
        ]);

        $conversation = Conversation::create([
            'student_id' => $request->user()->id,
            'title' => $validated['title'] ?? 'گفتگوی جدید',
        ]);

        return response()->json([
            'message' => 'گفتگوی جدید ساخته شد.',
            'data' => $this->summary($conversation),
        ], 201);
    }

    /**
     * پیام‌های یک گفتگو؛ با باز کردن گفتگو پیام‌های پشتیبان خوانده‌شده می‌شوند
     */
    public function show(Request $request, int $conversation): JsonResponse
    {
        $model = $this->ownedConversation($request, $conversation);

        $model->update([
            'unread_student_count' => 0,
            'student_last_read_at' => now(),
        ]);

        $model->messages()->whereNull('read_at')->where('sender_id', '!=', $request->user()->id)
            ->update(['read_at' => now()]);

        return response()->json([
            'data' => [
                'conversation' => $this->summary($model->fresh()),
                'messages' => $this->messages($model),
            ],
        ]);
    }

    /**
     * ارسال پیام دانشجو (متن، کد، تصویر، فایل یا صدا)
     */
    public function storeMessage(
        SendChatMessageRequest $request,
        int $conversation,
    ): JsonResponse {
        $model = $this->ownedConversation($request, $conversation);

        if (! $this->sender->studentHasQuota($request->user())) {
            return response()->json([
                'message' => 'سهمیه چت شما تمام شده است. برای ادامه گفتگو درخواست ارتقا ثبت کنید.',
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
            'message' => 'پیام ارسال شد.',
            'data' => $this->messagePayload($message->load('sender')),
            'profile' => StudentProfilePayload::make(
                StudentProfile::query()
                    ->with(['user', 'mentor'])
                    ->where('user_id', $request->user()->id)
                    ->firstOrFail(),
            ),
        ], 201);
    }

    private function ownedConversation(Request $request, int $conversation): Conversation
    {
        return Conversation::query()
            ->where('student_id', $request->user()->id)
            ->findOrFail($conversation);
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Conversation $conversation): array
    {
        $conversation->loadMissing('support');

        return [
            'id' => $conversation->id,
            'title' => $conversation->title,
            'last_message_preview' => $conversation->last_message_preview,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'unread_count' => $conversation->unread_student_count,
            'support' => $conversation->support ? [
                'id' => $conversation->support->id,
                'name' => $conversation->support->name,
            ] : null,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function messages(Conversation $conversation): array
    {
        return $conversation->messages()
            ->with('sender')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (Message $message): array => $this->messagePayload($message))
            ->all();
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
