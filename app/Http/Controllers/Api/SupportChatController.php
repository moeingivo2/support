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

        $rows = $this->conversationScope($request, $ownerId)
            ->select([
                'student_id',
                DB::raw('count(*) as conversations_count'),
                DB::raw('sum(unread_support_count) as unread_count'),
                DB::raw('max(last_message_at) as last_message_at'),
            ])
            ->when($studentId !== null, fn ($query) => $query->where('student_id', $studentId))
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

        $conversations = $this->conversationScope($request, $ownerId)
            // با باز کردن پروفایل یک دانشجو، فقط گفتگوهای همان نفر می‌آید.
            ->when($studentId !== null, fn ($query) => $query->where('student_id', $studentId))
            ->with([
                'student:id,name,phone',
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
     * دامنه‌ی دید گفتگو؛ همان شرط در `students()`، `index()` و شمارنده‌ی
     * خوانده‌نشده استفاده می‌شود تا نشانگر با فهرست نخوانَد.
     *
     * بدون `owner_id` همه‌ی گفتگوها نمایش داده می‌شوند — ناظر اکانت هم یک
     * پشتیبان است و در صفحه‌ی گفتگوی خودش مثل بقیه‌ی پشتیبان‌ها رفتار
     * می‌کند. دامنه‌ی محدود فقط وقتی است که با `owner_id` صریحاً به حساب
     * یکی از اعضای تیم رفته باشد (از صفحه‌ی «نظارت بر روی تیم»).
     *
     * @return Builder<Conversation>
     */
    private function conversationScope(Request $request, ?int $ownerId): Builder
    {
        $query = Conversation::query()
            ->when($ownerId !== null, fn ($query) => $query->where('support_id', $ownerId));

        $this->applyTrackScope($query, $request);

        return $query;
    }

    /**
     * هر حوزه‌ی چت خودش را دارد: گفتگوی دانشجوی مسیر «وب» را فقط پشتیبان‌های
     * وب می‌بینند و گفتگوی مسیر «هوش مصنوعی» را فقط پشتیبان‌های هوش مصنوعی.
     *
     * دانشجویی که هنوز مسیری ثبت نکرده (دوره‌ی حضوری یا مدرسه‌ای) در هر دو
     * حوزه دیده می‌شود تا گفتگویش بی‌پاسخ نماند.
     *
     * ناظرِ فقط‌خواندنی نوع پشتیبانی ندارد و چون دسترسی‌اش فقط خواندنی است،
     * حسابرسی‌اش همه‌ی حوزه‌ها را می‌بیند.
     */
    private function applyTrackScope(Builder $query, Request $request, string $column = 'conversations.student_id'): void
    {
        $track = $request->user()->support_type;

        if ($track === null) {
            return;
        }

        $query->where(function ($conversations) use ($track, $column): void {
            // یا مسیر دانشجو با حوزه‌ی پشتیبان یکی است، یا هنوز مسیری ثبت
            // نشده — چه پروفایل نداشته باشد و چه مسالش خالی باشد — و در نتیجه
            // در هر دو حوزه دیده می‌شود.
            $conversations
                ->whereExists(function ($profiles) use ($track, $column): void {
                    $profiles->selectRaw('1')
                        ->from('student_profiles')
                        ->whereColumn('student_profiles.user_id', $column)
                        ->where('student_profiles.track', $track);
                })
                ->orWhereDoesntHave('student.profile')
                ->orWhereHas('student.profile', fn ($profile) => $profile->whereNull('track'));
        });
    }

    /**
     * مجموع پیام‌های خوانده‌نشده — یک بار محاسبه و کش می‌شود تا در هر
     * poll به‌جای اسکن کامل جدول اجرا نشود.
     */
    private function unreadTotal(Request $request, ?int $ownerId): int
    {
        return (int) Cache::remember(
            $this->unreadTotalKey($request, $ownerId),
            2,
            fn (): int => (int) $this->conversationScope($request, $ownerId)->sum('unread_support_count'),
        );
    }

    /**
     * بعد از خواندن یا ارسال پیام، شمارنده‌ی کش‌شده باید فوراً از بین
     * برود؛ وگرنه تا ۲ ثانیه‌ی بعد poll همان عددِ قدیمی را نشان می‌دهد.
     */
    private function forgetUnreadTotal(Request $request, ?int $ownerId): void
    {
        Cache::forget($this->unreadTotalKey($request, $ownerId));
    }

    private function unreadTotalKey(Request $request, ?int $ownerId): string
    {
        return 'support:unread_total:'.$request->user()->id.':'.($ownerId ?? 'team');
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
        $unread = $this->conversationScope($request, $ownerId)
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
        // کل تیم همان نوع: همه پشتیبان‌ها به‌علاوه‌ی خودِ ناظر، چون ناظر هم
        // عضو تیم است و باید بتواند به خودش هم شیفت بدهد.
        $supports = User::query()
            ->whereIn('role', ['support', 'account_observer'])
            ->where('support_type', $request->user()->support_type)
            ->select(['id', 'name', 'support_type'])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $supports]);
    }

    /**
     * «نظارت بر روی تیم»: نمای تیمی ناظر اکانت.
     *
     * هر عضو با تعداد گفتگو، شمارنده‌ی خوانده‌نشده و وضعیت شیفتش برمی‌گردد
     * تا ناظر بداند کدام پشتیبان را باید از صفحه‌ی نظارت ببیند یا به‌جایش
     * وارد حسابش شود. متن گفتگو اینجا هرگز برنمی‌گردد؛ برای خواندن و
     * پاسخ‌دادن باید به حساب همان پشتیبان وارد شود.
     */
    public function teamSupervision(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'account_observer', 403);

        $team = User::query()
            ->where('role', 'support')
            ->where('support_type', $request->user()->support_type)
            ->where('id', '!=', $request->user()->id)
            ->withCount([
                'assignedConversations as conversations_count',
                'assignedConversations as unread_conversations_count' => fn ($query) => $query->where('unread_support_count', '>', 0),
            ])
            ->withExists(['shifts as on_shift' => fn ($query) => $query->where('status', 'active')])
            ->orderBy('name')
            ->get(['id', 'name', 'phone', 'support_type']);

        return response()->json([
            'data' => $team->map(fn (User $support): array => [
                'id' => $support->id,
                'name' => $support->name,
                'phone' => $support->phone,
                'support_type' => $support->support_type,
                'conversations_count' => (int) $support->conversations_count,
                'unread_conversations_count' => (int) $support->unread_conversations_count,
                'on_shift' => (bool) $support->on_shift,
            ]),
            'support_type' => $request->user()->support_type,
        ]);
    }

    public function impersonate(Request $request, User $support): JsonResponse
    {
        abort_unless($request->user()->role === 'account_observer', 403);
        abort_unless(
            $support->role === 'support'
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
        // دامنه‌ی `owner_id` فقط گفتگوی همان پشتیبان را باز می‌کند؛ بدون این
        // شرط، ناظر می‌توانست با یک owner_id معتبر به گفتگوی هر پشتیبان دیگری
        // هم دسترسی بزند.
        abort_unless($ownerId === null || $model->support_id === $ownerId, 403);
        // فقط ناظرِ فقط‌خواندنی و کارآموز هیچ تغییری روی گفتگو نمی‌گذارند.
        // ناظر اکانت خودش پشتیبان است و مثل بقیه شمارنده را برمی‌دارد؛ وگرنه
        // نشانگر «خوانده‌نشده» او هیچ‌وقت صفر نمی‌شد.
        $isReadOnly = $request->user()->isReadOnlyViewer();

        if ($isReadOnly) {
            // ناظر و کارآموز فقط‌خواندنی هستند: نه خوانده‌نشده پاک می‌شود، نه مسئولیت گفتگو جابه‌جا می‌شود
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
                $this->forgetUnreadTotal($request, $ownerId);
            }
        }

        return response()->json([
            'data' => [
                'conversation' => $this->summary(
                    $model->load(['student:id,name,phone', 'support:id,name', 'rating'])
                ),
                'profile' => $request->user()->isReadOnlyViewer() ? null : $this->studentProfile($model),
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
                // توکن impersonation فقط تا وقتی معتبر است که پشتیبان هنوز در
                // تیم هم‌نوعِ ناظر باشد؛ با تغییر نوع یا خروج از تیم، دسترسی
                // هم بسته می‌شود.
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

        $this->forgetUnreadTotal($request, null);

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
        // ناظر اکانت هم یک پشتیبان است، پس مثل بقیه می‌تواند گفتگوی حوزه‌ی خودش
        // را ببندد. فقط ناظرِ فقط‌خواندنی از این کار محروم است.
        abort_if($request->user()->isObserver(), 403);
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
        $query = Conversation::query()->with(['student', 'support']);

        // باز کردن گفتگو هم مثل فهرست، محدود به حوزه‌ی خود پشتیبان است؛ وگرنه
        // یک پشتیبان می‌توانست با حدس‌زدن شناسه به گفتگوی حوزه‌ی دیگر هم
        // دسترسی بزند.
        $this->applyTrackScope($query, $request);

        return $query->findOrFail($conversation);
    }

    /**
     * پشتیبانِ تحت مدیریت این ناظر اکانت: هر پشتیبانی که از همان نوع
     * پشتیبانی او باشد. اتصال تیم‌ها بر اساس نوع است، نه انتساب تک‌تک.
     */
    private function isOwnManagedSupport(?User $observer, ?User $support): bool
    {
        return $observer !== null
            && $support !== null
            && $support->role === 'support'
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
