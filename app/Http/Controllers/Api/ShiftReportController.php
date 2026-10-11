<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MessageRating;
use App\Models\ShiftReport;
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
     * در بازه‌ی همان شیفت.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $report = ShiftReport::with(['shift', 'user'])->findOrFail($id);

        $from = $report->shift->start_time;
        $to = $report->shift->end_time ?? now();

        $dissatisfactions = MessageRating::query()
            ->where('support_agent_id', $report->user_id)
            ->where('rating_value', '<=', 3)
            ->whereBetween('submitted_at', [$from, $to])
            ->with('student:id,name')
            ->orderBy('submitted_at')
            ->get()
            ->map(fn (MessageRating $rating): array => [
                'student_name' => $rating->student?->name ?? '—',
                'rating_value' => $rating->rating_value,
                'description' => $rating->description,
                'submitted_at' => $rating->submitted_at?->toIso8601String(),
            ]);

        return response()->json([
            'report' => $report,
            'dissatisfactions' => $dissatisfactions,
        ]);
    }

    /**
     * فیلترها: پشتیبان (user_id)، نوع پشتیبانی (channel از شیفت)، روز خاص
     * یا بازه‌ی تاریخ.
     */
    private function applyFilters($query, Request $request): void
    {
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('channel')) {
            $query->whereHas('shift', function ($shiftQuery) use ($request) {
                $shiftQuery->where('channel', $request->input('channel'));
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
}
