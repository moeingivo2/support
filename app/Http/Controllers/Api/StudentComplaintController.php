<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Support\ComplaintType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * بخش دانشجو: نارضایتی‌های خودش.
 *
 * دانشجو فقط چیزی را می‌بیند که خودش ثبت کرده؛ `user_id` از روی نشست
 * گرفته می‌شود و هیچ‌وقت از ورودی خوانده نمی‌شود.
 *
 * اعلانِ جداگانه‌ای وجود ندارد؛ پنل دانشجو همین فهرست را دوباره می‌خواند
 * و خودش تغییرِ وضعیت را تشخیص می‌دهد.
 */
class StudentComplaintController extends Controller
{
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
                'subject' => self::subject($complaint),
                'description' => $complaint->description,
                'created_at' => $complaint->created_at?->toIso8601String(),
                'updated_at' => $complaint->updated_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $complaints]);
    }

    /**
     * برچسبِ کوتاهِ موضوع نارضایتی.
     *
     * پیشوند فقط وقتی اضافه می‌شود که خودِ نام با آن شروع نشود، وگرنه نامی
     * که دانشجو نوشته (مثل «دوره پایتون») دو بار پیشوند می‌گیرد.
     */
    public static function subject(Complaint $complaint): string
    {
        if ($complaint->type === ComplaintType::Mentor) {
            return self::prefixed('منتور', $complaint->mentorFullName());
        }

        if ($complaint->type === ComplaintType::Course) {
            return self::prefixed('دوره', $complaint->course_name);
        }

        return 'پشتیبانی';
    }

    private static function prefixed(string $prefix, ?string $name): string
    {
        $name = trim((string) $name);

        if ($name === '') {
            return $prefix;
        }

        return str_starts_with($name, $prefix) ? $name : $prefix.' '.$name;
    }
}
