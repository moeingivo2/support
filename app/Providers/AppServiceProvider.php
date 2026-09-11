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
        // ورود/ثبت‌نام: سخت‌گیرانه تا brute-force ممکن نشود
        RateLimiter::for('auth', function (Request $request) {
            return [
                Limit::perMinute(5)->by('auth:'.$request->ip()),
                Limit::perHour(60)->by('auth-hourly:'.$request->ip()),
            ];
        });

        // کل API: سقف منطقی برای ۵۰۰۰ کاربر همزمان، جلوگیری از DoS دیتابیسی
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
