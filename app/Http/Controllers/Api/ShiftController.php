<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StartShiftRequest;
use App\Models\Shift;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    // شروع شیفت جدید
    public function start(StartShiftRequest $request)
    {
        $user = $request->user();

        // چک کن آیا کاربر شیفت فعال داره یا نه
        $activeShift = Shift::where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($activeShift) {
            return response()->json([
                'message' => 'شما در حال حاضر یک شیفت فعال دارید',
                'shift' => $activeShift,
            ], 422);
        }

        $shift = Shift::create([
            'user_id' => $user->id,
            'channel' => $user->support_type ?? 'web',
            'start_time' => now(),
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'شیفت با موفقیت شروع شد',
            'shift' => $shift,
        ], 201);
    }

    // پایان شیفت
    public function end(Request $request, $id)
    {
        $shift = Shift::findOrFail($id);

        // چک کن این شیفت متعلق به همین کاربره
        if ($shift->user_id !== $request->user()->id) {
            return response()->json(['message' => 'دسترسی غیرمجاز'], 403);
        }

        if ($shift->status === 'ended') {
            return response()->json(['message' => 'این شیفت قبلاً پایان یافته'], 422);
        }

        $shift->update([
            'end_time' => now(),
            'status' => 'ended',
        ]);

        return response()->json([
            'message' => 'شیفت با موفقیت پایان یافت',
            'shift' => $shift,
        ]);
    }

    // شیفت فعال کاربر لاگین‌شده (برای صفحه گزارش پایان شیفت فرانت)
    public function current(Request $request)
    {
        $shift = Shift::where('user_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        return response()->json(['data' => $shift]);
    }

    // لیست شیفت‌های فعال (برای داشبورد ادمین - کارت "پشتیبان‌های فعال")
    public function active()
    {
        $shifts = Shift::with('user')
            ->where('status', 'active')
            ->get();

        return response()->json([
            'count' => $shifts->count(),
            'shifts' => $shifts,
        ]);
    }

    // لیست همه شیفت‌ها (برای جدول اصلی داشبورد - فقط ادمین)
    public function index()
    {
        $shifts = Shift::with(['user', 'report'])
            ->orderBy('created_at', 'desc')
            ->paginate(min(request('per_page', 20), 100));

        return response()->json($shifts);
    }

    // شیفت‌های خود کاربر لاگین‌شده
    public function myShifts(Request $request)
    {
        $shifts = Shift::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate(min($request->input('per_page', 20), 100));

        return response()->json($shifts);
    }

    // نمایش جزئیات یک شیفت خاص
    public function show($id)
    {
        $shift = Shift::with(['user', 'report'])->findOrFail($id);
        return response()->json($shift);
    }
}