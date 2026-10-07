<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendChatMessageRequest;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ObserverAccessLog;
use App\Models\StudentProfile;
use App\Models\User;
use App\Support\ChatMessageSender;
use App\Support\ConversationCloser;
use App\Support\StudentProfilePayload;
use App\Support\UnsupportedAttachmentException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * صندوق ورودی مشترک پشتیبان‌ها: همه پشتیبان‌ها همه گفتگوهای دانشجویان را می‌بینند.
 *
 * ناظر (observer) فقط‌خواندنی است: متن گفتگوها را می‌بیند اما هیچ تغییری
 * اعمال نمی‌کند و هر دسترسی او ثبت می‌شود. سوپر ادمین طبق سیاست دسترسی ندارد.
 */
class SupportChatController extends Controller
{
    /** سقف ردیف‌های فهرست و اعلان؛ بدون آن پاسخ با رشد داده بزرگ می‌شود */
    private const INBOX_LIMIT = 200;

    /** سقف دانشجویان فهرست‌شده در نمای «دانشجوها». */
    private const STUDENT_LIMIT = 200;

    private const NOTIFICATION_LIMIT = 200;

    /** تعداد پیام هر درخواست ترنسکریپت */
    private const MESSAGE_PAGE = 100;

    public function __construct(
        private readonly ChatMessageSender $sender,
        private readonly ConversationCloser $closer,
    ) {}

    /**
     * فهرست گفتگوهای دانشجویان همراه با نشانگر خوانده‌نشده و پشتیبان مسئول
     *
     * rating باید داخل eager-load بیاید؛ در غیر این صورت برای هر ردیف یک
     * کوئری جداگانه اجرا می‌شد (۲۰۰+ کوئری در هر بار به‌روزرسانی).
     */
    /**
     * فهرست دانشجویان، هر کدام با تعداد گفتگو و آخرین فعالیت.
     *
     * پشتیبان به‌جای دیدن یک صفحه‌ی شلوغ از گفتگوهای پراکنده، اول دانشجوها
     * را می‌بیند و بعد گفتگوهای همان یک نفر را باز می‌کند. همه‌چیز در یک
     * کوئری جمع می‌شود تا فهرست بلند نشود.
     */
    public function students(Request $request): JsonResponse
    {
        $studentId = $request->integer('student_id') ?: null;
        $ownerId = $request->integer('owner_id') ?: null;
        $this->authorizeObserverOwner($request, $ownerId);

        $rows = Conversation::query()
            ->select([
                'student_id',
                DB::raw('count(*) as conversations_count'),
                DB::raw('sum(unread_support_count) as unread_count'),
                DB::raw('max(last_message_at) as last_message_at'),
            ])
            ->when($studentId !== null, fn ($query) => $query->where('student_id', $studentId))
            ->when($ownerId !== null, fn ($query) => $query->where('support_id', $ownerId))
            ->when($ownerId === null && $request->user()->role === 'account_observer', fn ($query) => $query->where(fn ($conversations) => $conversations
                ->whereNull('support_id')
                ->orWhereHas('support', fn ($support) => $support
                    ->where('observer_id', $request->user()->id)
                    ->where('support_type', $request->user()->support_type))))
            ->groupBy('student_id')
            ->orderByDesc('last_message_at')
            ->limit(self::STUDENT_LIMIT)
            ->get();

        if ($rows->isEmpty()) {
            return response()->json(['data' => []]);
        }

        $students = User::query()
            ->whereIn('id', $rows->pluck('student_id'))
            ->get()
            ->keyBy('id');

        $data = [];

        foreach ($rows as $row) {
            $student = $students->get($row->student_id);

            if ($student === null) {
                continue;
            }

            $data[] = [
                'student' => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'phone' => $student->phone,
                ],
                'conversations_count' => (int) $row->conversations_count,
                'unread_count' => (int) $row->unread_count,
                'last_message_at' => $row->last_message_at?->toIso8601String(),
            ];
        }

        return response()->json(['data' => $data]);
    }

    public function index(Request $request): JsonResponse
    {
        $studentId = $request->integer('student_id') ?: null;
        $ownerId = $request->integer('owner_id') ?: null;
        $this->authorizeObserverOwner($request, $ownerId);

        $conversations = Conversation::query()
            // با باز کردن پروفایل یک دانشجو، فقط گفتگوهای همان نفر می‌آید.
            ->when($studentId !== null, fn ($query) => $query->where('student_id', $studentId))
            ->when($ownerId !== null, fn ($query) => $query->where('support_id', $ownerId))
            ->when($ownerId === null && $request->user()->role === 'account_observer', fn ($query) => $query->where(fn ($conversations) => $conversations->whereNull('support_id')->orWhereHas('support', fn ($support) => $support->where('observer_id', $request->user()->id)->where('support_type', $request->user()->support_type))))
            ->with([
                'student:id,name,email,phone',
                'support:id,name',
                'rating:id,conversation_id,rating_value,closure_actor,submitted_at',
            ])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(self::INBOX_LIMIT)
            ->get()
            ->map(fn (Conversation $conversation): array => $this->summary($conversation));

        return response()->json([
            'data' => $conversations,
            'unread_total' => $this->unreadTotal($request, $ownerId),
        ]);
    }

    /**
     * دامنه‌ی محاسبه‌ی خوانده‌نشده‌ها؛ همان شرط `students()` و `index()`.
     *
     * ناظر اکانت فقط گفتگوهای بدون پشتیبان و پشتیبان‌های منتسب به تیم خودش
     * را می‌بیند، پس شمارنده‌ی خوانده‌نشده هم باید همان دامنه را رعایت کند.
     *
     * @return Builder<Conversation>
     */
    private function unreadScope(Request $request, ?int $ownerId): Builder
    {
        return Conversation::query()
            ->when($ownerId !== null, fn ($query) => $query->where('support_id', $ownerId))
            ->when($ownerId === null && $request->user()->role === 'account_observer', fn ($query) => $query->where(function ($conversations) use ($request): void {
                $conversations
                    ->whereNull('support_id')
                    ->orWhereHas('support', fn ($support) => $support
                        ->where('observer_id', $request->user()->id)
                        ->where('support_type', $request->user()->support_type));
            }));
    }

    /**
     * مجموع پیام‌های خوانده‌نشده — یک بار محاسبه و کش می‌شود تا در هر
     * poll به‌جای اسکن کامل جدول اجرا نشود.
     */
    private function unreadTotal(Request $request, ?int $ownerId): int
    {
        return (int) Cache::remember(
            'support:unread_total:'.$request->user()->id.':'.($ownerId ?? 'team'),
            2,
            fn (): int => (int) $this->unreadScope($request, $ownerId)->sum('unread_support_count'),
        );
    }

    /**
     * شمارنده‌های نوتیفیکیشن پشتیبان.
     *
     * طبق سیاست حریم خصوصی، فقط نام دانشجو و تعداد خوانده‌نشده برگردانده
     * می‌شود؛ پیش‌نمایش متن پیام هرگز در این پاسخ قرار نمی‌گیرد.
     */
    public function notifications(Request $request): JsonResponse
    {
        $ownerId = $request->integer('owner_id') ?: null;
        $this->authorizeObserverOwner($request, $ownerId);
        $unread = $this->unreadScope($request, $ownerId)
            ->where('unread_support_count', '>', 0)
            ->with('student:id,name')
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->limit(self::NOTIFICATION_LIMIT)
            ->get();

        return response()->json([
            'unread_total' => $this->unreadTotal($request, $ownerId),
            'unread_conversations' => $unread->count(),
            'unread' => $unread->map(fn (Conversation $conversation): array => [
                'conversation_id' => $conversation->id,
                'student_name' => $conversation->student?->name,
                'last_message_at' => $conversation->last_message_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    public function assignedSupports(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'account_observer', 403);
        $supports = User::query()
            ->where('observer_id', $request->user()->id)
            ->where('role', 'support')
            ->where('support_type', $request->user()->support_type)
            ->select(['id', 'name', 'support_type'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $supports]);
    }

    public function impersonate(Request $request, User $support): JsonResponse
    {
        abort_unless($request->user()->role === 'account_observer', 403);
        abort_unless(
            $support->role === 'support'
            && $support->observer_id === $request->user()->id
            && $support->support_type === $request->user()->support_type,
            403,
        );

        ObserverAccessLog::create([
            'observer_id' => $request->user()->id,
            'conversation_id' => null,
            'action' => 'impersonate_support:'.$support->id,
            'ip_address' => $request->ip(),
        ]);

        $token = $support->createToken(
            'observer-impersonation:'.$request->user()->id,
            ['*'],
            now()->addHours(2),
        )->plainTextToken;

        return response()->json(['user' => $support, 'token' => $token]);
    }

    /**
     * پیام‌های گفتگو به‌همراه اطلاعات دانشجو؛ با باز کردن گفتگو پیام‌ها خوانده می‌شوند
     */
    public function show(Request $request, int $conversation): JsonResponse
    {
        $ownerId = $request->integer('owner_id') ?: null;
        $this->authorizeObserverOwner($request, $ownerId);
        $model = $this->conversation($request, $conversation);
        abort_unless(
            $request->user()->role !== 'account_observer'
            || ($ownerId !== null
                ? $model->support_id === $ownerId
                : $model->support === null
                    || $this->isOwnManagedSupport($request->user(), $model->support)),
            403,
        );
        // مسیر صفرکردن خوانده‌نشده فقط برای پشتیبان (و ادمین) است؛ ناظر تیمی
        // و ناظر اکانت هیچ تغییری روی گفتگو اعمال نمی‌کنند.
        $isObserver = $request->user()->isObserver() || $request->user()->isAccountObserver();

        if ($isObserver) {
            // ناظر فقط‌خواندنی است: نه خوانده‌نشده پاک می‌شود، نه مسئولیت گفتگو جابه‌جا می‌شود
            if (Cache::add('observer-access:'.$request->user()->id.':'.$model->id, true, 60)) {
                $this->logObserverAccess($request, $model);
            }
        } else {
            // نوشتن فقط وقتی لازم است که چیزی تغییر کرده باشد؛
            // poll هر ۵ ثانیه نباید بی‌دلیل در دیتابیس بنویسد.
            $needsUpdate = $model->unread_support_count > 0
                || ($request->user()->isSupport() && $model->support_id !== $request->user()->id)
                || $model->support_last_read_at === null
                || $model->support_last_read_at->lt(now()->subMinute());

            if ($needsUpdate) {
                $model->update([
                    'unread_support_count' => 0,
                    'support_last_read_at' => now(),
                    'support_id' => $request->user()->isSupport() ? $request->user()->id : $model->support_id,
                ]);
            }
        }

        return response()->json([
            'data' => [
                'conversation' => $this->summary(
                    $model->load(['student:id,name,email,phone', 'support:id,name', 'rating'])
                ),
                'profile' => $request->user()->isObserver() ? null : $this->studentProfile($model),
                // سقف تعداد پیام تا یک گفتگوی طولانی کل حافظه را پر نکند.
                // ترتیب نزولی نگه داشته می‌شود: MessageList فرض می‌کند
                // messages[0] جدیدترین است و روی آن اسکرول می‌کند. معکوس‌کردن
                // اینجا باعث می‌شد هر پیام جدید پنل را به قدیمی‌ترین پیام ببرد.
                'messages' => $model->messages()
                    ->when($request->integer('after_id') > 0, fn ($query) => $query->where('id', '>', $request->integer('after_id')))
                    ->with('sender:id,name')
                    ->orderByDesc('created_at')
                    ->orderByDesc('id')
                    ->limit(self::MESSAGE_PAGE)
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
            $sender = $request->user();
            $tokenName = $sender->currentAccessToken()?->name ?? '';
            if (str_starts_with($tokenName, 'observer-impersonation:')) {
                $observerId = (int) substr($tokenName, strlen('observer-impersonation:'));
                $observer = User::query()->whereKey($observerId)->where('role', 'account_observer')->first();
                // توکن impersonation فقط تا وقتی معتبر است که ناظر هنوز این
                // پشتیبان را داشته باشد؛ لغو انتساب، دسترسی را هم می‌بندد.
                abort_unless($this->isOwnManagedSupport($observer, $sender), 403);

                ObserverAccessLog::create([
                    'observer_id' => $observer->id,
                    'conversation_id' => $model->id,
                    'action' => 'reply_as_support:'.$sender->id,
                    'ip_address' => $request->ip(),
                ]);
                $request->attributes->set('actor_id', $observer->id);
                $request->attributes->set('actor_name', $observer->name.' (به‌جای '.$sender->name.')');
            }
            if ($sender->role === 'account_observer') {
                // ناظر اکانت بدون impersonation هم می‌تواند پاسخ بدهد، اما
                // فقط به‌جای یکی از پشتیبان‌های خودش و با ثبت صریح هویت.
                $ownerId = $request->integer('acting_support_id') ?: null;
                abort_unless($ownerId !== null && ($model->support_id === null || $model->support_id === $ownerId), 403);
                $actingAs = User::query()->whereKey($ownerId)->first();
                abort_unless($this->isOwnManagedSupport($sender, $actingAs), 403);

                $sender = $actingAs;
                $request->attributes->set('actor_id', $request->user()->id);
                $request->attributes->set('actor_name', $request->user()->name.' (به‌جای '.$actingAs->name.')');
                $this->logObserverAccess($request, $model, 'reply_as_support:'.$actingAs->id);
                // مسیر show() برای ناظر اکانت خوانده‌نشده را صفر نمی‌کند؛ از آنجا
                // که پاسخ ثبت شده، گفتگو رسیدگی‌شده محسوب و شمارنده‌ی تیم پاک می‌شود.
                $model->forceFill([
                    'unread_support_count' => 0,
                    'support_last_read_at' => now(),
                ])->save();
            }
            if ($sender->id !== $request->user()->id) {
                $model->forceFill(['support_id' => $sender->id])->save();
            }
            $message = $this->sender->send(
                $model,
                $sender,
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
        abort_unless($request->user()->role !== 'account_observer', 403);
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

    private function logObserverAccess(Request $request, Conversation $conversation, string $action = 'view_transcript'): void
    {
        ObserverAccessLog::create([
            'observer_id' => $request->user()->id,
            'conversation_id' => $conversation->id,
            'action' => $action,
            'ip_address' => $request->ip(),
        ]);
    }

    private function conversation(Request $request, int $conversation): Conversation
    {
        $model = Conversation::query()
            ->with(['student', 'support'])
            ->findOrFail($conversation);

        abort_unless(
            $request->user()->role !== 'account_observer'
            || $model->support === null
            || $model->support->support_type === $request->user()->support_type
            || $model->support_id === $request->user()->id,
            403,
        );

        return $model;
    }

    /**
     * پشتیبانِ تحت مدیریت این ناظر اکانت: هم به او انتساب داده شده و هم
     * از همان نوع پشتیبانی است.
     */
    private function isOwnManagedSupport(?User $observer, ?User $support): bool
    {
        return $observer !== null
            && $support !== null
            && $support->role === 'support'
            && $support->observer_id === $observer->id
            && $support->support_type === $observer->support_type;
    }

    private function authorizeObserverOwner(Request $request, ?int $ownerId): void
    {
        if ($ownerId === null || $request->user()->role !== 'account_observer') {
            return;
        }

        abort_unless(
            User::query()
                ->whereKey($ownerId)
                ->where('role', 'support')
                ->where('observer_id', $request->user()->id)
                ->where('support_type', $request->user()->support_type)
                ->exists(),
            403,
        );
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
        $rating = $conversation->relationLoaded('rating')
            ? $conversation->getRelation('rating')
            : $conversation->rating()->first();

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
                && $rating === null,
            'rating_value' => $rating?->rating_value,
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
