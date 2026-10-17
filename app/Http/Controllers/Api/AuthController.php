<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterSupportRequest;
use App\Models\User;
use App\Support\IranianPhone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // ثبت‌نام پشتیبان جدید (لینک عمومی)
    public function registerSupport(RegisterSupportRequest $request)
    {
        $user = User::create([
            'name' => $request->name,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => 'support',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'ثبت‌نام با موفقیت انجام شد',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    // ورود فقط با شماره موبایل
    public function login(Request $request)
    {
        $request->validate([
            'phone' => 'required|string|max:32',
            'password' => 'required',
        ]);

        $user = $this->findByPhone((string) $request->phone);

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'اطلاعات ورود اشتباه است'], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * پیدا کردن کاربر با هر قالبی از شماره که کاربر تایپ کرده باشد.
     *
     * قالبِ ذخیره‌شده در سامانه `98xxxxxxxxx` است (همان‌طور که ثبت‌نام ذخیره
     * می‌کند)، ولی کاربر ممکن است `0912…` یا `+98912…` هم بنویسد. قبلاً
     * جست‌وجوی خام بود و فقط دقیقاً همان رشته‌ای که در دیتابیس بود پیدا
     * می‌کرد، پس ورودِ پنل با ثبت‌نامِ دانشجو ناسازگار بود.
     */
    private function findByPhone(string $input): ?User
    {
        $raw = IranianPhone::toEnglishDigits(trim($input));
        $normalized = IranianPhone::normalize($raw);

        $candidates = array_filter(array_unique([
            $normalized,
            $raw,
            $normalized === null ? null : IranianPhone::display($normalized),
        ]));

        if ($candidates === []) {
            return null;
        }

        return User::query()->whereIn('phone', $candidates)->first();
    }

    // خروج
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'خروج موفق']);
    }

    // اطلاعات کاربر لاگین‌شده
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
