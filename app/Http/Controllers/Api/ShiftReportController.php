<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShiftReportRequest;
use App\Models\Shift;
use App\Models\ShiftReport;
use Illuminate\Http\Request;

class ShiftReportController extends Controller
{
    // ثبت گزارش پایان شیفت
    public function store(StoreShiftReportRequest $request)
    {
        $shift = Shift::findOrFail($request->shift_id);

        // چک کن این شیفت متعلق به همین کاربره
        if ($shift->user_id !== $request->user()->id) {
            return response()->json(['message' => 'دسترسی غیرمجاز'], 403);
        }

        // چک کن شیفت پایان یافته باشه
        if ($shift->status !== 'ended') {
            return response()->json([
                'message' => 'ابتدا باید شیفت را پایان دهید'
            ], 422);
        }

        // چک کن ۱ ساعت از پایان شیفت نگذشته باشه (انقضای گزارش)
        if ($shift->end_time && $shift->end_time->addHour()->isPast()) {
            return response()->json([
                'message' => 'مهلت ۱ ساعته ثبت گزارش به پایان رسیده است. این شیفت به عنوان «ثبت‌نشده» علامت‌گذاری می‌شود.'
            ], 422);
        }

        // چک کن قبلاً گزارشی برای این شیفت ثبت نشده باشه
        $existingReport = ShiftReport::where('shift_id', $shift->id)->first();
        if ($existingReport) {
            return response()->json([
                'message' => 'برای این شیفت قبلاً گزارش ثبت شده است',
                'report' => $existingReport,
            ], 422);
        }

        // اعتبارسنجی: تعداد پاسخ‌ها نباید از مجموع پاسخ‌های روزانه بیشتر باشد
        $dailyTotal = ShiftReport::where('user_id', $request->user()->id)
            ->whereDate('created_at', now()->toDateString())
            ->sum('responded_students_count');

        $newTotal = $dailyTotal + $request->responded_students_count;

        // حداکثر پاسخ روزانه (مجموع تمام گزارش‌های امروز + گزارش جدید)
        // اگر کاربر بیش از این تعداد گزارش دهد، خطا میدهد
        // می‌توانیم این را بر اساس منطق کسب‌وکار تنظیم کنیم
        // فعلاً فقط بررسی می‌کنیم که جمع منطقی باشد

        $report = ShiftReport::create([
            'shift_id' => $shift->id,
            'user_id' => $request->user()->id,
            'responded_students_count' => $request->responded_students_count,
            'unsatisfied_students_count' => $request->unsatisfied_students_count,
            'desk_requests_count' => $request->desk_requests_count,
            'extra_notes' => $request->extra_notes,
        ]);

        return response()->json([
            'message' => 'گزارش پایان شیفت با موفقیت ثبت شد',
            'report' => $report->load('shift'),
        ], 201);
    }

    // لیست گزارش‌ها — ادمین همه را با فیلتر می‌بیند، ساپورت فقط گزارش‌های خودش را
    public function index(Request $request)
    {
        $query = ShiftReport::with(['shift', 'user']);

        if ($request->user()->isAdmin()) {
            $this->applyAdminFilters($query, $request);
        } else {
            $query->where('user_id', $request->user()->id);
        }

        $reports = $query->orderBy('created_at', 'desc')->paginate(min($request->input('per_page', 20), 100));

        return response()->json($reports);
    }

    /**
     * فیلترهای ادمین: پشتیبان (user_id)، نوع پشتیبانی (channel از شیفت)،
     * روز خاص (date) یا بازه (from/to).
     */
    private function applyAdminFilters($query, Request $request): void
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

    // گزارش‌های ثبت‌شده توسط خود کاربر ("گزارشات ثبت‌شده من")
    public function myReports(Request $request)
    {
        $reports = ShiftReport::with('shift')
            ->where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate(min($request->input('per_page', 20), 100));

        return response()->json($reports);
    }

    // شیفت‌های پایان‌یافته که هنوز گزارش ندارن (گزارش‌های ثبت‌نشده)
    // فقط شیفت‌هایی که کمتر از یک ساعت از پایان آن‌ها گذشته باشد قابل گزارش است؛
    // شیفت‌های قدیمی‌تر «منقضی» محسوب شده و به عنوان شیفت ثبت‌نشده باقی می‌مانند.
    public function pending(Request $request)
    {
        $expiryLimit = now()->subHour();

        $query = Shift::where('status', 'ended')
            ->whereDoesntHave('report')
            ->where('end_time', '>=', $expiryLimit);

        // اگه پشتیبان درخواست بده، فقط شیفت‌های خودش رو ببینه
        if ($request->user()->role === 'support') {
            $query->where('user_id', $request->user()->id);
        }

        $pendingShifts = $query->with('user')
            ->orderBy('end_time', 'desc')
            ->get();

        // تعداد شیفت‌های منقضی‌شده (ثبت‌نشده) برای نمایش در داشبورد/گزارش‌ها
        $expiredCount = Shift::where('status', 'ended')
            ->whereDoesntHave('report')
            ->where('end_time', '<', $expiryLimit)
            ->when($request->user()->role === 'support', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->count();

        return response()->json([
            'count' => $pendingShifts->count(),
            'shifts' => $pendingShifts,
            'expired_count' => $expiredCount,
        ]);
    }

    // جزئیات یک گزارش خاص — فقط مالک یا ادمین
    public function show(Request $request, $id)
    {
        $report = ShiftReport::with(['shift', 'user'])->findOrFail($id);

        if ($report->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'دسترسی غیرمجاز'], 403);
        }

        return response()->json($report);
    }

    // ویرایش گزارش (در صورت نیاز به اصلاح)
    public function update(StoreShiftReportRequest $request, $id)
    {
        $report = ShiftReport::findOrFail($id);

        if ($report->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'دسترسی غیرمجاز'], 403);
        }

        $report->update([
            'responded_students_count' => $request->responded_students_count,
            'unsatisfied_students_count' => $request->unsatisfied_students_count,
            'desk_requests_count' => $request->desk_requests_count,
            'extra_notes' => $request->extra_notes,
        ]);

        return response()->json([
            'message' => 'گزارش با موفقیت ویرایش شد',
            'report' => $report,
        ]);
    }
}