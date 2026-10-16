<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreComplaintRequest;
use App\Models\Complaint;
use App\Models\Conversation;
use App\Support\ComplaintStatus;
use App\Support\ComplaintType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * نارضایتی‌ها — یکپارچه و ثبت‌شده توسط دانشجو.
 *
 * قبلاً دو سیستم جدا بود: `complaints` که کارکنان برای دانشجو ثبت
 * می‌کردند و `mentor_feedback` که خود دانشجو می‌نوشت. حالا دانشجو خودش
 * یکی از سه نوع را انتخاب می‌کند و همه در همین جدول می‌نشینند.
 */
class ComplaintController extends Controller
{
    /**
     * ثبت نارضایتی توسط دانشجو.
     */
    public function store(StoreComplaintRequest $request): JsonResponse
    {
        $payload = $request->payload();

        $complaint = Complaint::create([
            'user_id' => $request->user()->id,
            ...$payload,
            'status' => ComplaintStatus::Open->value,
        ]);

        // برای نوع «پشتیبانی» می‌خواهیم بدانیم شکایت بابت کدام پشتیبان بوده
        // تا در فعالیت همان پشتیبان دیده شود. اگر دانشجو از صفحه‌ی گفتگو
        // ثبت کرده باشد، پشتیبانِ همان گفتگو ملاک است.
        if ($complaint->type === ComplaintType::Support && $complaint->conversation_id !== null) {
            $complaint->forceFill([
                'support_id' => Conversation::query()
                    ->whereKey($complaint->conversation_id)
                    ->value('support_id'),
            ])->save();
        }

        return response()->json([
            'message' => 'نارضایتی شما ثبت شد. کارشناسان پیگیری می‌کنند.',
            'data' => $complaint->fresh(),
        ], 201);
    }

    /**
     * فهرست نارضایتی‌ها برای پنل، با فیلترِ نوع و بازه‌ی زمانی و وضعیت.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', 'in:support,mentor,course'],
            'status' => ['nullable', 'in:open,in_progress,resolved'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $complaints = Complaint::query()
            ->with(['user:id,name,phone', 'support:id,name'])
            ->when($validated['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['from'] ?? null, fn ($query, $from) => $query->whereDate('created_at', '>=', $from))
            ->when($validated['to'] ?? null, fn ($query, $to) => $query->whereDate('created_at', '<=', $to))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(min((int) ($validated['per_page'] ?? 20), 100));

        return response()->json($complaints);
    }

    /**
     * شمارش برای نشان قرمز.
     *
     * فقط نارضایتی‌های «خوانده‌نشده» را می‌شمارد تا با باز کردن صفحه کم
     * شوند؛ شمارش بر اساس وضعیت هم باید فیلتر شود چون این شمارنده در
     * همان صفحه‌ی فهرست می‌نشیند.
     */
    public function summary(Request $request): JsonResponse
    {
        $base = Complaint::query()->whereNull('seen_at');

        $type = $request->input('type');

        if (in_array($type, ['support', 'mentor', 'course'], true)) {
            $base->where('type', $type);
        }

        return response()->json([
            'unseen' => $base->count(),
            'open' => Complaint::query()->where('status', '!=', ComplaintStatus::Resolved->value)->count(),
        ]);
    }

    /**
     * باز کردن نارضایتی‌های فهرست، یعنی «خوانده شد».
     *
     * نشان قرمز با همین صفر می‌شود، پس این کار در همان لحظه‌ای انجام می‌شود
     * که کاربر واقعاً لیست را می‌بیند.
     */
    public function markSeen(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['nullable', 'in:support,mentor,course'],
        ]);

        Complaint::query()
            ->whereNull('seen_at')
            ->when($validated['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->update(['seen_at' => now()]);

        return response()->json(['message' => 'نارضایتی‌ها خوانده‌شده علامت خوردند.']);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $complaint = Complaint::findOrFail($id);

        $complaint->forceFill(['seen_at' => $complaint->seen_at ?? now()])->save();

        return response()->json(['data' => $complaint->load(['user:id,name,phone', 'support:id,name'])]);
    }

    /**
     * تغییر وضعیت رسیدگی.
     *
     * نوع عمداً قابل تغییر نیست: نوع را دانشجو انتخاب کرده و باید همان
     * بماند، وگرنه فیلترِ نوع هم‌خوانِ نظرِ او نمی‌ماند.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $complaint = Complaint::findOrFail($id);

        $validated = $request->validate([
            'status' => ['sometimes', 'in:open,in_progress,resolved'],
        ], [], ['status' => 'وضعیت']);

        if (isset($validated['status'])) {
            $complaint->status = $validated['status'];
            $complaint->save();
        }

        return response()->json([
            'message' => 'وضعیت نارضایتی به‌روز شد.',
            'data' => $complaint->fresh(),
        ]);
    }

    /**
     * حذف نارضایتی بی‌ربط (اسپم) توسط ناظر یا سوپر ادمین.
     *
     * حذف کامل است، نه «resolved»، چون درخواست این بوده که از فعالیتِ
     * پشتیبان هم پاک شود — چیزی که با تغییر وضعیت ممکن نبود.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        Complaint::findOrFail($id)->delete();

        return response()->json(['message' => 'نارضایتی حذف شد.']);
    }
}
