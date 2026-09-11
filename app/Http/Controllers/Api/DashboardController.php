<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Resource;
use App\Models\Shift;
use App\Models\ShiftReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    /**
     * آمار داشبورد — با کش ۶۰ ثانیه‌ای تا بار دیتابیس زیر ۵۰۰۰ کاربر همزمان قابل تحمل بماند.
     */
    public function index(Request $request)
    {
        $data = Cache::remember('dashboard:metrics', 60, function () {
            $weekStart = now()->subDays(7);

            return [
                'weeklySatisfaction' => Complaint::where('created_at', '>=', $weekStart)->count(),
                'answeredStudents' => ShiftReport::where('created_at', '>=', $weekStart)->sum('responded_students_count'),
                'mentorIssues' => Complaint::where('created_at', '>=', $weekStart)->where('status', '!=', 'resolved')->count(),
                'availableServices' => Resource::count(),
            ];
        });

        return response()->json(['data' => $data]);
    }
}
