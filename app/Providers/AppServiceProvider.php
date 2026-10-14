<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * سقف تلاشِ ورود بر اساس IP.
     *
     * چون کلید این سقف IP است، همه‌ی کاربرانِ پشت یک NAT یا یک شبکه‌ی
     * داخلی در یک سطل قرار می‌گیرند. سقفِ سختِ ۵ در دقیقه باعث می‌شد دو
     * کاربرِ پشت یک روتر همدیگر را قفل کنند. سقفِ حساب‌محور (۵ در دقیقه
     * و ۲۰ در ساعت) سخت‌گیرانه باقی مانده چون همان چیزی است که جلوی حدس
     * رمز را می‌گیرد.
     */
    private const AUTH_IP_PER_MINUTE = 30;

    private const AUTH_IP_PER_HOUR = 200;

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

            $keys = array_values(array_filter([$login, $phone]));

            // `array_values` لازم است: `array_filter` کلیدها را نگه می‌دارد،
            // پس وقتی ‎login‎ خالی است ‎phone‎ روی اندیس ۱ می‌نشیند و
            // ‎$keys[0]‎ وجود ندارد. آن‌وقت `?? $request->ip()` بی‌صدا به IP
            // برمی‌گشت و سقفِ «حساب‌محور» عملاً همان سقفِ IP می‌شد؛ یعنی
            // حفاظت از حدس رمز روی یک حسابِ مشخص، هرگز اتفاق نمی‌افتاد و
            // در عوض هر پنج تلاشِ ورود از یک IP کل آن IP را می‌بست.
            $account = $keys[0] ?? $request->ip();

            return [
                // سقفِ حساب سخت‌گیرانه است چون همان چیزی است که جلوی
                // حدس رمز را می‌گیرد.
                Limit::perMinute(5)->by('auth-account:'.$account)->response($this->throttleResponse()),
                Limit::perHour(20)->by('auth-account-hourly:'.$account)->response($this->throttleResponse()),
                // سقفِ IP عمداً درشت‌تر است: کلیدِ آن IP است، پس همه‌ی
                // کسانی که پشت یک NAT یا یک شبکه‌ی داخلی‌اند در یک سطل
                // می‌افتند. با ۵ در دقیقه، دو کاربرِ پشت یک روتر عملاً
                // همدیگر را قفل می‌کردند.
                Limit::perMinute(self::AUTH_IP_PER_MINUTE)
                    ->by('auth-ip:'.$request->ip())
                    ->response($this->throttleResponse()),
                Limit::perHour(self::AUTH_IP_PER_HOUR)
                    ->by('auth-ip-hourly:'.$request->ip())
                    ->response($this->throttleResponse()),
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

    /**
     * پاسخ فارسی و قابل‌فهم برای ۴۲۹.
     *
     * پیش‌فرض لاراول انگلیسی است ("Too Many Attempts.") و چون متن فارسی
     * ندارد، فرانت‌اند هم نمی‌تواند از آن استفاده کند و پیام کلی نشان
     * می‌دهد. اینجا مدتِ انتظار را هم می‌فرستیم تا کاربر بداند کِی دوباره
     * تلاش کند.
     */
    private function throttleResponse(): \Closure
    {
        return function (Request $request, array $headers) {
            $retryAfter = (int) ($headers['Retry-After'] ?? 60);
            $retryAfter = max(1, $retryAfter);

            return response()->json([
                'message' => 'تعداد تلاش‌ها زیاد است. لطفاً '
                    .$retryAfter
                    .' ثانیه دیگر دوباره تلاش کنید.',
                'retry_after' => $retryAfter,
            ], 429, $headers);
        };
    }
}
