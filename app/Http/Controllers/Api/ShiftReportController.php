<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MessageRating;
use App\Models\ShiftReport;
use App\Support\ShiftReportGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftReportController extends Controller
{
    /**
     * فهرست گزارش‌های خودکار پایان شیفت — فقط برای سوپر ادمین و ناظرها.
     * پشتیبان‌ها جایی برای ثبت یا دیدن گزارش ندارند؛ گزارش به‌صورت خودکار
     * از لاگ گفتگو هنگام پایان شیفت تولید می‌شود.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ShiftReport::with(['shift', 'user']);

        $this->applyFilters($query, $request);

        $reports = $query->orderBy('created_at', 'desc')
            ->paginate(min($request->input('per_page', 20), 100));

        return response()->json($reports);
    }

    /**
     * جزئیات یک گزارش به‌همراه دلایل نارضایتی ثبت‌شده (امتیازهای کمتر از ۴)
     * که به همین شیفت نسبت داده شده‌اند.
     *
     * مبنا «شیفتی است که پشتیبان در آن جواب داده»، نه «زمانی که دانشجو
     * امتیاز را زده»؛ وگرنه نارضایتیِ ثبت‌شده در روز بعد اصلاً دیده
     * نمی‌شد.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $report = ShiftReport::with(['shift', 'user'])->findOrFail($id);

        $this->authorizeChannel($request, $report);

        $toArray = fn (MessageRating $rating): array => [
            'id' => $rating->id,
            'student_name' => $rating->student?->name ?? '—',
            'rating_value' => $rating->rating_value,
            'description' => $rating->description,
            'submitted_at' => $rating->submitted_at?->toIso8601String(),
            'dismissed_at' => $rating->dismissed_at?->toIso8601String(),
            'dismissed_by' => $rating->dismisser?->name,
        ];

        $dissatisfactions = ShiftReportGenerator::unsatisfiedQuery($report->shift)
            ->with(['student:id,name', 'dismisser:id,name'])
            ->orderBy('submitted_at')
            ->get()
            ->map($toArray);

        // جدا نگه‌داشته شده تا ناظر بتواند کنار گذاشتنِ اشتباه را برگرداند.
        $dismissedDissatisfactions = ShiftReportGenerator::dismissedUnsatisfiedQuery($report->shift)
            ->with(['student:id,name', 'dismisser:id,name'])
            ->orderBy('dismissed_at', 'desc')
            ->get()
            ->map($toArray);

        return response()->json([
            'report' => $report,
            'dissatisfactions' => $dissatisfactions,
            'dismissed_dissatisfactions' => $dismissedDissatisfactions,
        ]);
    }

    /**
     * فیلترها: پشتیبان (user_id)، روز خاص یا بازه‌ی تاریخ.
     *
     * فیلترِ «نوع پشتیبانی» از رابط کاربری حذف شده چون برای ناظر اکانت
     * گمراه‌کننده بود: کانالش از روی خودش تعیین می‌شود و انتخاب دستیِ
     * کانالِ دیگر فقط باعث می‌شد فکر کند اختیار دارد.
     */
    private function applyFilters($query, Request $request): void
    {
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        // ناظرِ اکانت فقط گزارشِ کانال خودش را می‌بیند؛ اگر کانالِ دیگری
        // را هم در آدرس یا کوئری‌استرینگ بفرستد نادیده گرفته می‌شود.
        $channel = $request->user()?->effectiveChannel($request->input('channel'));

        if ($channel !== null) {
            $query->whereHas('shift', function ($shiftQuery) use ($channel) {
                $shiftQuery->where('channel', $channel);
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->input('date'));
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->input('to'));
        }
    }

    /**
     * ناظرِ اکانت به گزارشِ کانالِ خودش محدود است.
     *
     * بدون این بررسی، حذف فیلتر از فرم کافی نبود: کاربر می‌توانست شناسه‌ی
     * یک گزارشِ هوش مصنوعی را مستقیم در آدرس بگذارد و آن را بخواند.
     */
    private function authorizeChannel(Request $request, ShiftReport $report): void
    {
        $restricted = $request->user()?->restrictedChannel();

        if ($restricted === null) {
            return;
        }

        abort_unless(
            $report->shift?->channel === $restricted,
            403,
            'دسترسی به گزارش شیفتِ این کانال مجاز نیست.',
        );
    }
}
