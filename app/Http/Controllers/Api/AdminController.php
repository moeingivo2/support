<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminRegisterSupportRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    /**
     * ثبت پشتیبان جدید — فقط ادمین. نوع پشتیبانی (وب/هوش مصنوعی) در همین ثبت تعیین
     * و برای همیشه روی کاربر می‌ماند.
     */
    public function storeSupport(AdminRegisterSupportRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => 'support',
            'support_type' => $request->support_type,
        ]);

        return response()->json([
            'message' => 'پشتیبان با موفقیت ثبت شد',
            'user' => $user,
        ], 201);
    }

    /**
     * لیست پشتیبان‌ها — فقط ادمین.
     */
    public function supports(Request $request)
    {
        $supports = User::where('role', 'support')
            ->when($request->filled('support_type'), function ($query) use ($request) {
                $query->where('support_type', $request->support_type);
            })
            ->select('id', 'name', 'phone', 'support_type', 'created_at')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $supports]);
    }
}
