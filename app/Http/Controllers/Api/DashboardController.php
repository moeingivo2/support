<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Resource;
use App\Models\ShiftReport;
use App\Support\ComplaintStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    /**
     * کلیدِ کش — بخشِ دیدِ نارضایتی داخل کلید است.
     *
     * آمارِ نارضایتی فقط به سوپر ادمین نشان داده می‌شود، پس اگر یک کلیدِ
     * مشترک باشد، مقدارِ کش‌شده‌ی ادمین به بقیه‌ی نقش‌ها هم می‌رسد. با
     * تفکیک کلید، هر گروه کشِ خودش را دارد.
     */
    private const CACHE_KEY = 'dashboard:metrics';

    private const CACHE_SECONDS = 60;

    /**
     * آمار داشبورد — با کش ۶۰ ثانیه‌ای تا بار دیتابیس زیر ۵۰۰۰ کاربر همزمان
     * قابل تحمل بماند.
     *
     * نارضایتی‌ها (پشتیبانی/منتور/دوره) همگی در جدول `complaints` هستند و
     * فقط سوپر ادمین آن‌ها را می‌بیند؛ بقیه‌ی نقش‌ها صفر می‌گیرند تا عددی
     * که در پنل‌شان نیست، در داشبورد هم نباشد.
     */
    public function index(Request $request)
    {
        $canSeeComplaints = $request->user()->isAdmin();

        $data = Cache::remember(
            self::CACHE_KEY.($canSeeComplaints ? ':admin' : ':panel'),
            self::CACHE_SECONDS,
            function () use ($canSeeComplaints): array {
                $weekStart = now()->subDays(7);

                $metrics = [
                    'answeredStudents' => ShiftReport::where('created_at', '>=', $weekStart)->sum('responded_students_count'),
                    'availableServices' => Resource::count(),
                    'weeklySatisfaction' => 0,
                    'openComplaints' => 0,
                    'unseenComplaints' => 0,
                ];

                if (! $canSeeComplaints) {
                    return $metrics;
                }

                $metrics['weeklySatisfaction'] = Complaint::where('created_at', '>=', $weekStart)->count();
                $metrics['openComplaints'] = Complaint::query()
                    ->where('created_at', '>=', $weekStart)
                    ->where('status', '!=', ComplaintStatus::Resolved->value)
                    ->count();
                // نشان قرمزِ شبیه تلگرام — بدون محدودیت زمانی، چون باید هر
                // نارضایتی تازه‌ای را نشان دهد.
                $metrics['unseenComplaints'] = Complaint::whereNull('seen_at')->count();

                return $metrics;
            },
        );

        return response()->json(['data' => $data]);
    }
}
