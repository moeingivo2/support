<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MessageRating;
use App\Models\Shift;
use App\Support\ShiftReportGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * کنار گذاشتنِ نارضایتیِ بی‌ربط روی امتیاز دانشجو.
 *
 * امتیازِ ۲ و کمتر یعنی «دانشجوی ناراضی» و در گزارش شیفت و ستون
 * «دانشجویان ناراضی» اکسل فعالیت شمرده می‌شود. بعضی از این امتیازها ربطی
 * به عملکرد پشتیبان ندارند (شوخی، تست، بی‌ربطیِ موضوع) و ناظر باید
 * بتواند آن‌ها را کنار بگذارد.
 *
 * رکورد حذف نمی‌شود؛ فقط از شمارش بیرون می‌رود و با «بازگرداندن» قابل
 * احیاست. بعد از هر تغییر، شمارشِ گزارش شیفت دوباره حساب می‌شود تا عددِ
 * گزارش و اکسل بلافاصله هماهنگ شوند.
 */
class MessageRatingController extends Controller
{
    public function dismiss(Request $request, MessageRating $rating): JsonResponse
    {
        if ($rating->isDismissed()) {
            return response()->json([
                'message' => 'این نارضایتی قبلاً کنار گذاشته شده است.',
            ]);
        }

        $rating->forceFill([
            'dismissed_at' => now(),
            'dismissed_by' => $request->user()->id,
        ])->save();

        $report = $this->refreshShiftReport($rating);

        return response()->json([
            'message' => 'نارضایتی به‌عنوان بی‌ربط کنار گذاشته شد.',
            'data' => $rating->fresh(),
            'report' => $report,
        ]);
    }

    public function restore(Request $request, MessageRating $rating): JsonResponse
    {
        if (! $rating->isDismissed()) {
            return response()->json([
                'message' => 'این نارضایتی کنار گذاشته نشده است.',
            ]);
        }

        $rating->forceFill([
            'dismissed_at' => null,
            'dismissed_by' => null,
        ])->save();

        $report = $this->refreshShiftReport($rating);

        return response()->json([
            'message' => 'نارضایتی به شمارش نارضایتی‌ها برگشت.',
            'data' => $rating->fresh(),
            'report' => $report,
        ]);
    }

    /**
     * شمارشِ گزارش شیفت را تازه می‌کند تا عددِ «دانشجویان ناراضی» و در نتیجه
     * اکسل فعالیت همان لحظه اصلاح شود.
     *
     * @return array{shift_report_id: int, unsatisfied_students_count: int}|null
     */
    private function refreshShiftReport(MessageRating $rating): ?array
    {
        $shiftId = $rating->shift_id
            ?? Shift::query()
                ->where('user_id', $rating->support_agent_id)
                ->where(function ($query) use ($rating): void {
                    $query
                        ->where('start_time', '<=', $rating->submitted_at)
                        ->where(function ($end) use ($rating): void {
                            $end
                                ->whereNull('end_time')
                                ->orWhere('end_time', '>=', $rating->submitted_at);
                        });
                })
                ->latest('start_time')
                ->value('id');

        if ($shiftId === null) {
            return null;
        }

        $report = ShiftReportGenerator::refresh(Shift::query()->findOrFail($shiftId));

        if ($report === null) {
            // شیفت هنوز تمام نشده و گزارشی ندارد؛ موقع پایان با منطق
            // تازه ساخته می‌شود.
            return null;
        }

        return [
            'shift_report_id' => $report->id,
            'unsatisfied_students_count' => $report->unsatisfied_students_count,
        ];
    }
}
