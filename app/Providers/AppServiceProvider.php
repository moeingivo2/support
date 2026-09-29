<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ورود/ثبت‌نام: هم بر اساس IP و هم بر اساس خودِ حساب.
        // بدون سقف حساب‌محور، یک مهاجم با استخر IP می‌توانست بی‌نهایت
        // رمز را روی یک حساب ادمین امتحان کند.
        RateLimiter::for('auth', function (Request $request) {
            $login = strtolower((string) $request->input('login'));
            $phone = strtolower((string) $request->input('phone'));

            $keys = array_filter([$login, $phone]);

            return [
                Limit::perMinute(5)->by('auth-ip:'.$request->ip()),
                Limit::perHour(60)->by('auth-ip-hourly:'.$request->ip()),
                Limit::perMinute(5)->by('auth-account:'.($keys[0] ?? $request->ip())),
                Limit::perHour(20)->by('auth-account-hourly:'.($keys[0] ?? $request->ip())),
            ];
        });

        // کل API: سقف منطقی برای ۵۰۰۰ کاربر همزمان، جلوگیری از DoS دیتابیسی
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // خروجی اکسل: ساخت این گزارش‌ها گران است و نباید درخواست مکرر
        // بتواند سرور را اشباع کند.
        RateLimiter::for('exports', function (Request $request) {
            return [
                Limit::perMinute(5)->by('export-ip:'.$request->ip()),
                Limit::perHour(20)->by('export-user:'.($request->user()?->id ?? $request->ip())),
            ];
        });
    }
}
