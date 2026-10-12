<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentUpgradeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * بررسی درخواست‌های ارتقای سهمیه چت توسط پشتیبان‌ها.
 *
 * دانشجو چند دوره را همزمان درخواست می‌دهد و پشتیبان پس از صحت‌سنجی،
 * درخواست را تأیید یا رد می‌کند. تأیید فقط سهمیه‌ی چت را بالا می‌برد؛
 * جلسات و دوره‌ها صرفاً برای راستی‌آزمایی ثبت شده‌اند.
 */
class StudentUpgradeRequestController extends Controller
{
    private const LIST_LIMIT = 200;

    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status');

        $requests = StudentUpgradeRequest::query()
            ->with('student:id,name,phone')
            ->when($status !== null, fn ($query) => $query->where('status', $status))
            ->orderByRaw("status <> 'pending'")
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(self::LIST_LIMIT)
            ->get()
            ->map(fn (StudentUpgradeRequest $upgrade): array => $this->payload($upgrade));

        return response()->json(['data' => $requests]);
    }

    public function show(Request $request, StudentUpgradeRequest $upgrade): JsonResponse
    {
        $upgrade->load(['student:id,name,phone']);

        return response()->json([
            'data' => $this->payload($upgrade),
        ]);
    }

    /**
     * تأیید درخواست: سهمیه‌ی چت پروفایل به‌اندازه‌ی extra_chats بالا می‌رود.
     * فقط از وضعیت pending قابل تأیید است؛ تکرار یا درخواست بسته رد می‌شود.
     */
    public function approve(Request $request, StudentUpgradeRequest $upgrade): JsonResponse
    {
        $updated = StudentUpgradeRequest::query()
            ->whereKey($upgrade->id)
            ->where('status', 'pending')
            ->update(['status' => 'approved']);

        if ($updated !== 1) {
            return response()->json([
                'message' => 'این درخواست قبلاً رسیدگی شده است.',
            ], 422);
        }

        $upgrade->refresh();
        $upgrade->student?->profile?->increment('total_chats', $upgrade->extra_chats);

        return response()->json([
            'message' => 'درخواست تأیید شد و سهمیه چت دانشجو افزایش یافت.',
            'data' => $this->payload($upgrade->load('student:id,name,phone')),
        ]);
    }

    public function reject(Request $request, StudentUpgradeRequest $upgrade): JsonResponse
    {
        $updated = StudentUpgradeRequest::query()
            ->whereKey($upgrade->id)
            ->where('status', 'pending')
            ->update(['status' => 'rejected']);

        if ($updated !== 1) {
            return response()->json([
                'message' => 'این درخواست قبلاً رسیدگی شده است.',
            ], 422);
        }

        $upgrade->refresh();

        return response()->json([
            'message' => 'درخواست رد شد.',
            'data' => $this->payload($upgrade->load('student:id,name,phone')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(StudentUpgradeRequest $upgrade): array
    {
        return [
            'id' => $upgrade->id,
            'student_id' => $upgrade->student_id,
            'student_name' => $upgrade->student?->name,
            'student_phone' => $upgrade->student?->phone,
            'courses' => $upgrade->courses ?? [],
            'extra_chats' => (int) $upgrade->extra_chats,
            'status' => $upgrade->status,
            'note' => $upgrade->note,
            'created_at' => $upgrade->created_at?->toIso8601String(),
        ];
    }
}
