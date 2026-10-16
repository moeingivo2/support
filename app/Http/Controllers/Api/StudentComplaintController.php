<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintNotification;
use App\Support\ComplaintStatusNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * بخش دانشجو: نارضایتی‌های خودش و اعلان‌های مربوط به آن‌ها.
 *
 * دانشجو فقط چیزی را می‌بیند که خودش ثبت کرده؛ `user_id` از روی نشست
 * گرفته می‌شود و هیچ‌وقت از ورودی خوانده نمی‌شود.
 */
class StudentComplaintController extends Controller
{
    private const NOTIFICATION_LIMIT = 50;

    /**
     * نارضایتی‌های خود دانشجو، با همان اطلاعاتی که پنل سوپر ادمین می‌بیند.
     */
    public function index(Request $request): JsonResponse
    {
        $complaints = Complaint::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (Complaint $complaint): array => [
                'id' => $complaint->id,
                'type' => $complaint->type->value,
                'status' => $complaint->status->value,
                'subject' => ComplaintStatusNotifier::subject($complaint),
                'description' => $complaint->description,
                'created_at' => $complaint->created_at?->toIso8601String(),
                'updated_at' => $complaint->updated_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $complaints]);
    }

    /**
     * اعلان‌های دانشجو، تازه‌ترین اول، به‌همراه شمارش خوانده‌نشده‌ها.
     */
    public function notifications(Request $request): JsonResponse
    {
        $base = ComplaintNotification::query()->where('user_id', $request->user()->id);

        return response()->json([
            'unread' => (clone $base)->whereNull('read_at')->count(),
            'data' => (clone $base)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->limit(self::NOTIFICATION_LIMIT)
                ->get()
                ->map(fn (ComplaintNotification $notification): array => [
                    'id' => $notification->id,
                    'complaint_id' => $notification->complaint_id,
                    'title' => $notification->title,
                    'body' => $notification->body,
                    'status' => $notification->status->value,
                    'read_at' => $notification->read_at?->toIso8601String(),
                    'created_at' => $notification->created_at?->toIso8601String(),
                ]),
        ]);
    }

    /**
     * علامت‌زدن اعلان‌ها به‌عنوان خوانده‌شده.
     */
    public function readNotifications(Request $request): JsonResponse
    {
        ComplaintNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'اعلان‌ها خوانده‌شده علامت خوردند.']);
    }
}
