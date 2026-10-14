<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendChatMessageRequest;
use App\Models\Conversation;
use App\Models\MessageRating;
use App\Models\StudentProfile;
use App\Support\ChatMessageSender;
use App\Support\ConversationCloser;
use App\Support\ShiftReportGenerator;
use App\Support\StudentProfilePayload;
use App\Support\UnsupportedAttachmentException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ConversationController extends Controller
{
    /** سقف ردیف‌های فهرست گفتگوها */
    private const LIST_LIMIT = 100;

    /** تعداد پیام هر درخواست */
    private const MESSAGE_PAGE = 200;

    public function __construct(
        private readonly ChatMessageSender $sender,
        private readonly ConversationCloser $closer,
    ) {}

    public function index(Request $request): JsonResponse
    {
        // rating و support باید eager-load شوند؛ در غیر این صورت برای هر
        // گفتگو دو کوئری جداگانه اجرا می‌شد (1 + 2N).
        $conversations = Conversation::query()
            ->where('student_id', $request->user()->id)
            ->with([
                'support:id,name',
                'rating:id,conversation_id,rating_value,closure_actor,submitted_at',
            ])
            ->newestFirst()
            ->limit(self::LIST_LIMIT)
            ->get()
            ->map(fn (Conversation $conversation): array => $this->summary($conversation));

        return response()->json(['data' => $conversations]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
        ]);

        // گفتگوی جدید همیشه رکورد تازه می‌سازد؛ گفتگوی بسته باز نمی‌شود.
        // عنوان از شماره‌ی ترتیبی دانشجو می‌آید (#۱، #۲، …) و دیگر از
        // متن پیام اول گرفته نمی‌شود.
        $sequence = $this->nextSequenceFor($request->user()->id);

        $conversation = Conversation::create([
            'student_id' => $request->user()->id,
            'student_sequence' => $sequence,
            'title' => '#'.$sequence,
        ]);

        return response()->json([
            'message' => 'گفتگوی جدید ساخته شد.',
            'data' => $this->summary($conversation),
        ], 201);
    }

    public function show(Request $request, int $conversation): JsonResponse
    {
        $model = $this->ownedConversation($request, $conversation);

        if ($model->unread_student_count > 0 || $model->student_last_read_at === null
            || $model->student_last_read_at->lt(now()->subMinute())) {
            $model->update([
                'unread_student_count' => 0,
                'student_last_read_at' => now(),
            ]);

            $model->messages()->whereNull('read_at')->where('sender_id', '!=', $request->user()->id)
                ->update(['read_at' => now()]);
        }

        $profile = StudentProfile::query()
            ->with(['user', 'mentor'])
            ->where('user_id', $request->user()->id)
            ->first();

        return response()->json([
            'data' => [
                'conversation' => $this->summary($model->fresh()),
                'rating' => $this->ratingPayload($model->fresh()),
                'profile' => $profile ? StudentProfilePayload::make($profile) : null,
                'messages' => $this->messages($model, $request->integer('after_id')),
            ],
        ]);
    }

    public function storeMessage(SendChatMessageRequest $request, int $conversation): JsonResponse
    {
        $model = $this->ownedConversation($request, $conversation);

        if ($model->isClosed()) {
            return response()->json([
                'message' => 'این گفتگو بسته شده است. برای ادامه، گفتگوی جدیدی بسازید.',
            ], 422);
        }

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
                StudentProfile::query()->with(['user', 'mentor'])->where('user_id', $request->user()->id)->firstOrFail(),
            ),
        ], 201);
    }

    /**
     * بستن گفتگو توسط دانشجو — با دروازه‌ی امتیاز اجباری
     */
    public function close(Request $request, int $conversation): JsonResponse
    {
        $model = $this->ownedConversation($request, $conversation);

        $validated = $request->validate([
            'rating_value' => ['required', 'integer', 'min:1', 'max:5'],
            'closure_confirmed' => ['required', 'boolean'],
            'description' => ['nullable', 'string', 'max:2000'],
        ], [], [
            'rating_value' => 'امتیاز',
            'closure_confirmed' => 'تایید هشدار',
            'description' => 'توضیح نارضایتی',
        ]);

        if ($this->ratingNeedsDescription((int) $validated['rating_value'], $validated['description'] ?? null)) {
            return response()->json([
                'message' => 'توضیح دلیل نارضایتی الزامی است.',
                'errors' => ['description' => [$this->descriptionRequiredMessage()]],
                'status' => 422,
            ], 422);
        }

        try {
            $closed = $this->closer->closeByStudent(
                $model,
                $request->user(),
                (int) $validated['rating_value'],
                (bool) $validated['closure_confirmed'],
                $validated['description'] ?? null,
            );
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'message' => 'گفتگو بسته شد و امتیاز شما ثبت گردید.',
            'data' => [
                'conversation' => $this->summary($closed),
                'rating' => $this->ratingPayload($closed),
            ],
        ]);
    }

    /**
     * امتیازدهی پس از بستن توسط پشتیبان (از طریق دعوت داخل گفتگو)
     */
    public function rate(Request $request, int $conversation): JsonResponse
    {
        $model = $this->ownedConversation($request, $conversation);

        $validated = $request->validate([
            'rating_value' => ['required', 'integer', 'min:1', 'max:5'],
            'description' => ['nullable', 'string', 'max:2000'],
        ], [], ['rating_value' => 'امتیاز', 'description' => 'توضیح نارضایتی']);

        if ($this->ratingNeedsDescription((int) $validated['rating_value'], $validated['description'] ?? null)) {
            return response()->json([
                'message' => 'توضیح دلیل نارضایتی الزامی است.',
                'errors' => ['description' => [$this->descriptionRequiredMessage()]],
                'status' => 422,
            ], 422);
        }

        try {
            $rating = $this->closer->rateClosedConversation(
                $model,
                $request->user(),
                (int) $validated['rating_value'],
                $validated['description'] ?? null,
            );
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'message' => 'امتیاز شما ثبت شد. از همراهی شما سپاسگزاریم.',
            'data' => [
                'conversation' => $this->summary($model->fresh()),
                'rating' => $this->ratingPayload($model->fresh(), $rating),
            ],
        ], 201);
    }

    private function ownedConversation(Request $request, int $conversation): Conversation
    {
        return Conversation::query()
            ->where('student_id', $request->user()->id)
            ->findOrFail($conversation);
    }

    /**
     * آیا این امتیاز نیازمند توضیح است؟
     *
     * آستانه از {@see ShiftReportGenerator::UNSATISFIED_MAX_RATING} می‌آید تا
     * «نارضایتی» در فرم امتیازدهی و در شمارشِ گزارش شیفت یکی باشد؛ وگرنه
     * دانشجویی که مجبور به نوشتن دلیل است ولی در گزارش ناراضی شمرده
     * نمی‌شود (یا برعکس).
     */
    private function ratingNeedsDescription(int $ratingValue, ?string $description): bool
    {
        return $ratingValue <= ShiftReportGenerator::UNSATISFIED_MAX_RATING
            && blank($description);
    }

    private function descriptionRequiredMessage(): string
    {
        return 'امتیاز '
            .ShiftReportGenerator::UNSATISFIED_MAX_RATING
            .' ستاره یا کمتر نیازمند توضیح دلیل نارضایتی است.';
    }

    /**
     * @return array<string, mixed>|null
     */
    private function ratingPayload(Conversation $conversation, ?MessageRating $fresh = null): ?array
    {
        $rating = $fresh ?? $conversation->rating;

        if ($rating === null) {
            return null;
        }

        return [
            'rating_value' => $rating->rating_value,
            'description' => $rating->description,
            'closure_actor' => $rating->closure_actor,
            'submitted_at' => $rating->submitted_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(Conversation $conversation): array
    {
        $rating = $conversation->relationLoaded('rating')
            ? $conversation->getRelation('rating')
            : $conversation->rating()->first();

        return [
            'id' => $conversation->id,
            'title' => $conversation->title,
            'last_message_preview' => $conversation->last_message_preview,
            'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            'unread_count' => $conversation->unread_student_count,
            'status' => $conversation->status->value,
            'status_label' => $conversation->status->label(),
            'closure_actor' => $conversation->closure_actor,
            'closed_at' => $conversation->closed_at?->toIso8601String(),
            'can_rate' => $conversation->isClosed()
                && $conversation->closure_actor === 'support'
                && $conversation->rating === null,
            'has_rating' => $rating !== null,
            'support' => $conversation->support ? [
                'id' => $conversation->support->id,
                'name' => $conversation->support->name,
            ] : null,
        ];
    }

    /**
     * شماره‌ی بعدی گفتگو برای این دانشجو.
     *
     * از بیشترین شماره‌ی موجود کمی بیشتر می‌شود تا شماره‌ها هرگز تکراری
     * نشوند، حتی اگر رکوردی حذف شده باشد.
     */
    private function nextSequenceFor(int $studentId): int
    {
        return (int) Conversation::query()
            ->where('student_id', $studentId)
            ->max('student_sequence') + 1;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function messages(Conversation $conversation, int $afterId = 0): array
    {
        return $conversation->messages()
            ->when($afterId > 0, fn ($query) => $query->where('id', '>', $afterId))
            ->with('sender')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(self::MESSAGE_PAGE)
            ->limit(self::MESSAGE_PAGE)
            ->get()
            ->map(fn ($message): array => $this->messagePayload($message))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload($message): array
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
            'actor_name' => $message->actor_name ?? $message->sender?->name,
            'is_edited' => (bool) $message->is_edited,
            'sender' => [
                'id' => $message->sender?->id,
                'name' => $message->sender?->name,
            ],
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }
}
