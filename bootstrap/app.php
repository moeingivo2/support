<?php

use App\Http\Middleware\CheckRole;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->append(SecurityHeaders::class);

        $middleware->alias([
            'role' => CheckRole::class,
        ]);

        // پشت nginx هستیم؛ بدون این، $request->ip() برای همه‌ی کاربران
        // IP کانتینر را برمی‌گرداند و rate-limiter عملاً یک سطل مشترک می‌شود.
        $middleware->trustProxies(at: '*');

        // این برنامه ریت login ندارد و ریدایرکت در API بی‌معنی است. بدون این،
        // هر درخواست بدون توکن و بدون هدر Accept (مثل <audio src>) به‌جای 401
        // یک RouteNotFoundException می‌گرفت و 500 برمی‌گشت.
        $middleware->redirectGuestsTo(null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // این برنامه فقط API است و ریتی به نام login ندارد. بدون این
        // بخش، میدلور auth برای درخواست بدون توکن تلاش می‌کند به همان ریت
        // ریدایرکت کند و در نتیجه به‌جای 401 یک خطای 500 می‌دهد.
        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'unauthenticated'], 401);
            }

            return null;
        });
    })->create();
