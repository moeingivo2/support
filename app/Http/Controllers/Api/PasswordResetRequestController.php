<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PasswordResetRequest;
use App\Support\IranianPhone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Validator as ValidatorContract;

class PasswordResetRequestController extends Controller
{
    /**
     * ثبت درخواست بازیابی رمز عبور بر پایه‌ی شماره موبایل.
     *
     * پاسخ همیشه یکسان است تا مشخص نشدن شماره‌ای که ثبت شده، افشا نشود؛ بازیابی
     * واقعی رمز توسط کارشناسان پشتیبانی انجام می‌شود.
     */
    public function store(Request $request): JsonResponse
    {
        $rawPhone = (string) $request->input('phone');

        $validator = Validator::make(
            ['phone' => $rawPhone],
            ['phone' => ['required', 'string', 'max:32']],
            [],
            ['phone' => 'شماره موبایل'],
        );

        // قالب نامعتبر، خطای اعتبارسنجی استاندارد برمی‌گرداند
        $validator->after(function (ValidatorContract $validator) use ($rawPhone): void {
            if ($rawPhone !== '' && IranianPhone::normalize($rawPhone) === null) {
                $validator->errors()->add('phone', 'شماره موبایل معتبر نیست. نمونه: ۰۹۱۲۳۴۵۶۷۸۹');
            }
        });

        $validator->validate();

        $genericMessage = 'اگر این شماره در سامانه ثبت شده باشد، درخواست شما ثبت شد و کارشناسان پشتیبانی با شما تماس می‌گیرند.';

        $phone = IranianPhone::normalize($rawPhone);

        // دو سقف لازم است: یکی بر اساس شماره و یکی بر اساس IP.
        // بدون سقف IP، یک مهاجم با چرخاندن شماره‌ها می‌توانست صف انتظار
        // پشتیبانی را سیل کند، چون هر درخواست یک ردیف «تماس بگیرید» می‌ساخت.
        $ipKey = 'password-reset-ip:'.$request->ip();

        if (RateLimiter::tooManyAttempts($ipKey, 5)) {
            return response()->json([
                'message' => 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
            ], 429);
        }

        $throttleKey = 'password-reset:'.$phone;

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            return response()->json([
                'message' => 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.',
            ], 429);
        }

        RateLimiter::hit($ipKey, 600);
        RateLimiter::hit($throttleKey, 600);

        PasswordResetRequest::firstOrCreate(
            ['phone' => $phone, 'status' => 'pending'],
            ['note' => 'درخواست بازیابی رمز عبور از صفحه ورود دانشجو'],
        );

        return response()->json(['message' => $genericMessage], 201);
    }
}
