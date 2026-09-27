<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class PasswordResetRequestController extends Controller
{
    /**
     * ثبت درخواست بازیابی رمز عبور.
     *
     * پاسخ همیشه یکسان است تا مشخص نشدن ایمیلی که ثبت شده، افشا نشود؛ بازیابی
     * واقعی رمز توسط کارشناسان پشتیبانی انجام می‌شود.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:190'],
        ]);

        $throttleKey = 'password-reset:'.mb_strtolower((string) $validated['email']);

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            return response()->json([
                'message' => 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
            ], 429);
        }

        RateLimiter::hit($throttleKey, 600);

        PasswordResetRequest::firstOrCreate(
            ['email' => mb_strtolower((string) $validated['email']), 'status' => 'pending'],
            ['note' => 'درخواست بازیابی رمز عبور از صفحه ورود دانشجو'],
        );

        return response()->json([
            'message' => 'درخواست شما ثبت شد. کارشناسان پشتیبانی از طریق ایمیل ثبت‌شده با شما تماس می‌گیرند.',
        ], 201);
    }
}
